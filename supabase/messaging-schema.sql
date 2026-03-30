-- ================================================================
-- SONCAR – Messaging System Schema
-- Creates:
--   • conversations table (direct + group chats)
--   • conversation_participants table
--   • messages table (text / image / file, with soft-delete + edit)
--   • message_reactions table
--   • message_audit_log table (super admin audit trail)
--   • conversation_reports table (moderation reports)
--   • RLS policies (participants-only read, role-gated write)
--   • Helper functions
--   • Notification trigger (new_message)
--   • Realtime publications
--   • Storage bucket + policies for message attachments
--
-- Run AFTER: notifications-v2-migration.sql (resolve_display_name must exist)
--
-- ALSO: In the Supabase dashboard → Storage, create a bucket called
--   "message-attachments" set to PRIVATE.
--   The RLS policies below handle access via signed URLs.
-- ================================================================


-- ── 1. Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text        NOT NULL CHECK (type IN ('direct', 'group')),
  name        text,                          -- group chats only
  description text,                          -- group chats only
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  last_read_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id           uuid        NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  content             text,
  message_type        text        NOT NULL DEFAULT 'text'
                                  CHECK (message_type IN ('text', 'image', 'file')),
  file_url            text,       -- public or signed URL for attachments
  file_name           text,       -- original filename (for file messages)
  file_size           bigint,     -- bytes
  reply_to_message_id uuid        REFERENCES public.messages(id) ON DELETE SET NULL,
  edited_at           timestamptz,
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id  uuid        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.message_audit_log (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id       uuid        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  original_content text,
  new_content      text,
  action           text        NOT NULL CHECK (action IN ('edit', 'delete')),
  performed_by     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  performed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_reports (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reported_by     uuid        NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  reason          text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'resolved')),
  resolved_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- ── 2. Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON public.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_sender_idx
  ON public.messages (sender_id);

CREATE INDEX IF NOT EXISTS messages_reply_idx
  ON public.messages (reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS conversation_participants_user_idx
  ON public.conversation_participants (user_id);

CREATE INDEX IF NOT EXISTS conversation_reports_status_idx
  ON public.conversation_reports (status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS message_audit_log_message_idx
  ON public.message_audit_log (message_id);

CREATE INDEX IF NOT EXISTS conversations_updated_idx
  ON public.conversations (updated_at DESC);

-- Full-text search on messages
CREATE INDEX IF NOT EXISTS messages_content_search_idx
  ON public.messages USING gin(to_tsvector('english', coalesce(content, '')));


-- ── 3. Helper functions ─────────────────────────────────────────

-- Check if current user is a participant in a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
  );
$$;

-- Check if current user is a super admin WITH an active report giving them access
CREATE OR REPLACE FUNCTION public.super_admin_has_report_access(p_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    AND EXISTS (
      SELECT 1 FROM public.conversation_reports
      WHERE conversation_id = p_conversation_id
        AND status = 'pending'
    );
$$;

-- Check if current user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT role IN ('admin', 'super_admin') FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Count conversations with unread messages for a given user
CREATE OR REPLACE FUNCTION public.count_unread_message_conversations(p_user_id uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(DISTINCT cp.conversation_id)
  FROM public.conversation_participants cp
  WHERE cp.user_id = p_user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.conversation_id = cp.conversation_id
        AND m.created_at > cp.last_read_at
        AND m.sender_id <> p_user_id
        AND m.deleted_at IS NULL
    );
$$;


-- ── 4. Row Level Security ───────────────────────────────────────

ALTER TABLE public.conversations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reports       ENABLE ROW LEVEL SECURITY;


-- ── conversations ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Participants can view conversations"           ON public.conversations;
DROP POLICY IF EXISTS "Super admins can view reported conversations"  ON public.conversations;
DROP POLICY IF EXISTS "Admin users can create conversations"          ON public.conversations;
DROP POLICY IF EXISTS "Super admins can update group conversations"   ON public.conversations;
DROP POLICY IF EXISTS "Super admins can delete conversations"         ON public.conversations;

CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT
  USING (public.is_conversation_participant(id));

CREATE POLICY "Super admins can view reported conversations"
  ON public.conversations FOR SELECT
  USING (public.super_admin_has_report_access(id));

CREATE POLICY "Admin users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (public.is_admin_role() AND auth.uid() = created_by);

CREATE POLICY "Super admins can update group conversations"
  ON public.conversations FOR UPDATE
  USING (
    type = 'group'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Super admins can delete conversations"
  ON public.conversations FOR DELETE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');


-- ── conversation_participants ───────────────────────────────────
DROP POLICY IF EXISTS "Participants can view members of their conversations"  ON public.conversation_participants;
DROP POLICY IF EXISTS "System can insert participants"                         ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own last_read_at"                ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations"                          ON public.conversation_participants;
DROP POLICY IF EXISTS "Super admins can manage participants"                   ON public.conversation_participants;

CREATE POLICY "Participants can view members of their conversations"
  ON public.conversation_participants FOR SELECT
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "System can insert participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    public.is_admin_role()
    OR (
      -- Super admins adding others via API (validated in route handler)
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
    )
  );

CREATE POLICY "Users can update their own last_read_at"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave conversations"
  ON public.conversation_participants FOR DELETE
  USING (
    user_id = auth.uid()  -- leaving yourself
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'  -- super admin removing others
  );


-- ── messages ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Participants can read messages"                    ON public.messages;
DROP POLICY IF EXISTS "Super admins can read reported conversation msgs"  ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages"                    ON public.messages;
DROP POLICY IF EXISTS "Senders can edit or soft-delete their messages"    ON public.messages;

CREATE POLICY "Participants can read messages"
  ON public.messages FOR SELECT
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "Super admins can read reported conversation msgs"
  ON public.messages FOR SELECT
  USING (public.super_admin_has_report_access(conversation_id));

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    public.is_conversation_participant(conversation_id)
    AND auth.uid() = sender_id
  );

CREATE POLICY "Senders can edit or soft-delete their messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id);


-- ── message_reactions ──────────────────────────────────────────
DROP POLICY IF EXISTS "Participants can view reactions"    ON public.message_reactions;
DROP POLICY IF EXISTS "Participants can add reactions"     ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions"   ON public.message_reactions;

CREATE POLICY "Participants can view reactions"
  ON public.message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.is_conversation_participant(m.conversation_id)
    )
  );

CREATE POLICY "Participants can add reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.is_conversation_participant(m.conversation_id)
    )
  );

CREATE POLICY "Users can remove their reactions"
  ON public.message_reactions FOR DELETE
  USING (user_id = auth.uid());


-- ── message_audit_log ──────────────────────────────────────────
DROP POLICY IF EXISTS "Super admins can read audit log"   ON public.message_audit_log;
DROP POLICY IF EXISTS "System can insert audit entries"   ON public.message_audit_log;

CREATE POLICY "Super admins can read audit log"
  ON public.message_audit_log FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "System can insert audit entries"
  ON public.message_audit_log FOR INSERT
  WITH CHECK (auth.uid() = performed_by);


-- ── conversation_reports ───────────────────────────────────────
DROP POLICY IF EXISTS "Reporters and super admins can view reports"  ON public.conversation_reports;
DROP POLICY IF EXISTS "Participants can submit reports"              ON public.conversation_reports;
DROP POLICY IF EXISTS "Super admins can resolve reports"             ON public.conversation_reports;

CREATE POLICY "Reporters and super admins can view reports"
  ON public.conversation_reports FOR SELECT
  USING (
    reported_by = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "Participants can submit reports"
  ON public.conversation_reports FOR INSERT
  WITH CHECK (
    reported_by = auth.uid()
    AND public.is_conversation_participant(conversation_id)
  );

CREATE POLICY "Super admins can resolve reports"
  ON public.conversation_reports FOR UPDATE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');


-- ── 5. Trigger: update conversations.updated_at on new message ──

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_update_conversation_ts ON public.messages;
CREATE TRIGGER on_message_update_conversation_ts
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();


-- ── 6. Trigger: send notification on new message ────────────────

CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender_name text;
  v_conv_type   text;
  v_conv_name   text;
  v_notif_msg   text;
  v_link        text;
  r             record;
BEGIN
  -- Skip deleted messages (shouldn't happen on insert, but be safe)
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;

  v_sender_name := public.resolve_display_name(NEW.sender_id);
  SELECT type, name INTO v_conv_type, v_conv_name
  FROM public.conversations WHERE id = NEW.conversation_id;

  v_link := '/messages?conversation=' || NEW.conversation_id;

  IF v_conv_type = 'group' THEN
    v_notif_msg := v_sender_name || ' sent a message in ' || coalesce(v_conv_name, 'a group chat');
  ELSE
    v_notif_msg := v_sender_name || ' sent you a message';
  END IF;

  -- Notify each other participant — at most one unread notification per
  -- conversation per 12 hours to avoid flooding the bell.
  FOR r IN
    SELECT user_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id <> NEW.sender_id
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = r.user_id
        AND type = 'new_message'
        AND link = v_link
        AND read_at IS NULL
        AND created_at > now() - interval '12 hours'
    ) THEN
      INSERT INTO public.notifications (user_id, type, message, link)
      VALUES (r.user_id, 'new_message', v_notif_msg, v_link);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.create_message_notification();


-- ── 7. Realtime publications ────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;


-- ── 8. Storage bucket policies (run after creating the bucket) ──
-- Create bucket "message-attachments" as PRIVATE in the Supabase dashboard first.
-- Then run these policies:

-- Allow admin/super_admin users to upload
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admin users can upload message attachments" ON storage.objects;
CREATE POLICY "Admin users can upload message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Participants can read message attachments" ON storage.objects;
CREATE POLICY "Participants can read message attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND auth.uid() IS NOT NULL
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "Uploaders can delete own message attachments" ON storage.objects;
CREATE POLICY "Uploaders can delete own message attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'message-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
