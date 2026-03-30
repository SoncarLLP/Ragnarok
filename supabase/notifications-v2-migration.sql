-- ================================================================
-- SONCAR – Notifications v2 migration
-- Extends the notifications system with:
--   • archived + admin_notice columns
--   • Triggers for reactions, comments, follows, warnings, bans, flags
--   • Reaction milestone notifications
--   • RLS update for member deletes on non-admin notices
--   • Realtime publication
--   • Backfill existing member_warnings into notifications table
--
-- Run AFTER: mentions-notifications-migration.sql, reactions-migration.sql,
--            privacy-migration.sql, display-name-migration.sql
-- ================================================================


-- ── 1. Extend notifications table ─────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS archived      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_notice  boolean NOT NULL DEFAULT false;

-- Index for efficient unread-count queries
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, read_at, archived)
  WHERE read_at IS NULL AND archived = false;

CREATE INDEX IF NOT EXISTS notifications_user_archived_idx
  ON public.notifications (user_id, archived);


-- ── 2. RLS: allow members to delete non-admin notifications ───
DROP POLICY IF EXISTS "Users can delete own non-admin notifications" ON public.notifications;
CREATE POLICY "Users can delete own non-admin notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id AND admin_notice = false);


-- ── 3. Enable Realtime for notifications ──────────────────────
-- Allows the bell component to receive live inserts.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ── 4. Helper: resolve display name respecting preference ─────
-- Used inside all notification triggers below.
CREATE OR REPLACE FUNCTION public.resolve_display_name(p_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    CASE
      WHEN display_name_preference = 'real_name' AND full_name IS NOT NULL AND full_name <> ''
        THEN full_name
      ELSE coalesce(username, full_name, 'Someone')
    END
  FROM public.profiles
  WHERE id = p_user_id;
$$;


-- ── 5. Trigger: reaction inserted → notify post/comment author ─
CREATE OR REPLACE FUNCTION public.create_reaction_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author_id    uuid;
  v_reactor_name text;
  v_link         text;
  v_type         text;
  v_post_id      uuid;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO v_author_id FROM public.posts WHERE id = NEW.post_id;
    v_link := '/community/' || NEW.post_id;
    v_type := 'reaction_post';
  ELSIF NEW.comment_id IS NOT NULL THEN
    SELECT c.user_id, c.post_id INTO v_author_id, v_post_id
    FROM public.comments c WHERE id = NEW.comment_id;
    v_link := '/community/' || v_post_id;
    v_type := 'reaction_comment';
  ELSE
    RETURN NEW;
  END IF;

  -- Skip if author not found or reacting to own content
  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN RETURN NEW; END IF;

  v_reactor_name := public.resolve_display_name(NEW.user_id);

  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (
    v_author_id,
    v_type,
    v_reactor_name || ' reacted ' || NEW.emoji || ' to your ' ||
      CASE WHEN NEW.post_id IS NOT NULL THEN 'post' ELSE 'comment' END,
    v_link
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_reaction_created_notify ON public.reactions;
CREATE TRIGGER on_reaction_created_notify
  AFTER INSERT ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION public.create_reaction_notification();


-- ── 6. Trigger: loyalty milestone → notify earner ─────────────
CREATE OR REPLACE FUNCTION public.create_milestone_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link    text;
  v_subject text;
  v_post_id uuid;
BEGIN
  IF NEW.reason = 'reaction_milestone_post' AND NEW.ref_id IS NOT NULL THEN
    v_link    := '/community/' || NEW.ref_id;
    v_subject := 'post';
  ELSIF NEW.reason = 'reaction_milestone_comment' AND NEW.ref_id IS NOT NULL THEN
    SELECT post_id INTO v_post_id FROM public.comments WHERE id = NEW.ref_id;
    v_link    := '/community/' || v_post_id;
    v_subject := 'comment';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (
    NEW.user_id,
    'reaction_milestone',
    'Your ' || v_subject || ' reached a reaction milestone — you earned ' ||
      NEW.delta || ' loyalty point' || CASE WHEN NEW.delta <> 1 THEN 's' ELSE '' END || '!',
    v_link
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_loyalty_milestone_notify ON public.loyalty_events;
CREATE TRIGGER on_loyalty_milestone_notify
  AFTER INSERT ON public.loyalty_events
  FOR EACH ROW EXECUTE FUNCTION public.create_milestone_notification();


-- ── 7. Trigger: new comment → notify post author ──────────────
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_author_id     uuid;
  v_commenter_name text;
BEGIN
  SELECT user_id INTO v_author_id FROM public.posts WHERE id = NEW.post_id;

  -- Skip self-comments or post not found
  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN RETURN NEW; END IF;

  v_commenter_name := public.resolve_display_name(NEW.user_id);

  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (
    v_author_id,
    'comment_on_post',
    v_commenter_name || ' commented on your post',
    '/community/' || NEW.post_id
  );

  RETURN NEW;
END;
$$;

-- NOTE: on_comment_created trigger already exists from community-schema.sql
-- (awards loyalty points). We add a separate trigger for the notification.
DROP TRIGGER IF EXISTS on_comment_created_notify ON public.comments;
CREATE TRIGGER on_comment_created_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.create_comment_notification();


-- ── 8. Trigger: new follower → notify followed user ───────────
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_follower_name text;
  v_username      text;
BEGIN
  v_follower_name := public.resolve_display_name(NEW.follower_id);
  SELECT username INTO v_username FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (
    NEW.following_id,
    'new_follower',
    v_follower_name || ' started following you',
    CASE WHEN v_username IS NOT NULL
      THEN '/account/profile/' || v_username
      ELSE '/account'
    END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_follow_created_notify ON public.follows;
CREATE TRIGGER on_follow_created_notify
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.create_follow_notification();


-- ── 9. Trigger: follow request sent/approved → notify ─────────
CREATE OR REPLACE FUNCTION public.create_follow_request_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
BEGIN
  -- New pending request → notify target
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    v_name := public.resolve_display_name(NEW.requester_id);
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (
      NEW.target_id,
      'follow_request',
      v_name || ' requested to follow you',
      '/account/follow-requests'
    );

  -- Request approved → notify the requester
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
    v_name := public.resolve_display_name(NEW.target_id);
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (
      NEW.requester_id,
      'follow_approved',
      v_name || ' approved your follow request',
      '/account'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_follow_request_notify ON public.follow_requests;
CREATE TRIGGER on_follow_request_notify
  AFTER INSERT OR UPDATE OF status ON public.follow_requests
  FOR EACH ROW EXECUTE FUNCTION public.create_follow_request_notification();


-- ── 10. Trigger: admin warning issued → admin_notice notification
CREATE OR REPLACE FUNCTION public.create_warning_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, message, link, admin_notice)
  VALUES (
    NEW.user_id,
    'warning',
    NEW.message,
    '/account/notifications',
    true
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_warning_created_notify ON public.member_warnings;
CREATE TRIGGER on_warning_created_notify
  AFTER INSERT ON public.member_warnings
  FOR EACH ROW EXECUTE FUNCTION public.create_warning_notification();


-- ── 11. Trigger: profile banned/suspended → admin_notice ──────
CREATE OR REPLACE FUNCTION public.create_ban_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status IN ('banned', 'suspended') THEN
    INSERT INTO public.notifications (user_id, type, message, link, admin_notice)
    VALUES (
      NEW.id,
      NEW.status,
      CASE
        WHEN NEW.status = 'banned'
          THEN 'Your account has been banned by the SONCAR moderation team.'
        ELSE 'Your account has been temporarily suspended by the SONCAR moderation team.'
      END,
      '/account/notifications',
      true
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_status_change_notify ON public.profiles;
CREATE TRIGGER on_profile_status_change_notify
  AFTER UPDATE OF status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_ban_notification();


-- ── 12. Trigger: post flagged → notify all super_admins ───────
CREATE OR REPLACE FUNCTION public.create_flag_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE role = 'super_admin' LOOP
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (
      r.id,
      'flagged_content',
      'A post has been flagged for review' ||
        COALESCE(': ' || NEW.reason, ''),
      '/community/' || NEW.post_id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_flagged_notify ON public.post_flags;
CREATE TRIGGER on_post_flagged_notify
  AFTER INSERT ON public.post_flags
  FOR EACH ROW EXECUTE FUNCTION public.create_flag_notification();


-- ── 13. Backfill existing member_warnings into notifications ──
-- Ensures historical warnings appear in the new unified notifications page.
-- ON CONFLICT DO NOTHING in case this migration is re-run.
INSERT INTO public.notifications
  (user_id, type, message, link, read_at, admin_notice, created_at)
SELECT
  user_id,
  'warning',
  message,
  '/account/notifications',
  read_at,
  true,
  created_at
FROM public.member_warnings
ON CONFLICT DO NOTHING;
