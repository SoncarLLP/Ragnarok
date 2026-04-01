import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { normalisePost, POST_SELECT } from "@/lib/community";
import type { PostData } from "@/lib/community";
import PostCard from "@/app/community/PostCard";
import FollowButton from "@/app/community/FollowButton";
import MemberBadge from "@/components/MemberBadge";
import MessageButton from "@/app/messages/MessageButton";
import BackToTop from "@/components/BackToTop";
import { mergePrivacySettings, mergeExtendedVisibility, canView } from "@/lib/privacy";
import type { AccountMode } from "@/lib/privacy";
import { getDisplayName } from "@/lib/display-name";

export default async function PublicProfilePage(props: unknown) {
  const rawParams =
    props && typeof props === "object" && "params" in props
      ? (props as { params?: unknown }).params
      : undefined;
  const params = rawParams instanceof Promise ? await rawParams : rawParams;
  const username =
    params && typeof params === "object" && "username" in params
      ? String((params as Record<string, unknown>).username)
      : undefined;

  if (!username) return notFound();

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, bio, avatar_url, role, tier, member_id, account_mode, privacy_settings, extended_profile_visibility, display_name_preference, messaging_disabled")
    .eq("username", username)
    .single();

  if (!profile) return notFound();

  const accountMode = (profile.account_mode ?? "public") as AccountMode;
  const privacySettings = mergePrivacySettings(profile.privacy_settings);
  const extendedVisibility = mergeExtendedVisibility(profile.extended_profile_visibility);

  // Determine viewer's relationship
  const isOwner = currentUser?.id === profile.id;

  // Check current user's role (admins bypass privacy)
  let viewerRole: string | null = null;
  if (currentUser && !isOwner) {
    const { data: vp } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();
    viewerRole = vp?.role ?? null;
  }
  const isAdmin = viewerRole === "admin" || viewerRole === "super_admin";

  // Private mode: only admins and owner can view
  if (accountMode === "private" && !isOwner && !isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold mb-2">Profile not available</p>
          <p className="text-sm mb-4" style={{ color: "var(--nrs-text-muted)" }}>
            This member&apos;s profile is private.
          </p>
          <Link href="/community" className="mt-4 inline-block text-sm hover:underline" style={{ color: "var(--nrs-accent)" }}>
            ← Back to Community
          </Link>
        </div>
      </main>
    );
  }

  // Check for block (viewer is blocked by profile owner, or viewer blocked the profile owner)
  let isBlockedByThem = false;
  let iBlockedThem = false;
  if (currentUser && !isOwner && !isAdmin) {
    const [{ data: blockByThem }, { data: iBlock }] = await Promise.all([
      supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", profile.id)
        .eq("blocked_id", currentUser.id)
        .maybeSingle(),
      supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", currentUser.id)
        .eq("blocked_id", profile.id)
        .maybeSingle(),
    ]);
    isBlockedByThem = !!blockByThem;
    iBlockedThem = !!iBlock;
  }

  if ((isBlockedByThem || iBlockedThem) && !isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold mb-2">Profile not available</p>
          <p className="text-sm mb-4" style={{ color: "var(--nrs-text-muted)" }}>
            This profile is not available.
          </p>
          <Link href="/community" className="mt-4 inline-block text-sm hover:underline" style={{ color: "var(--nrs-accent)" }}>
            ← Back to Community
          </Link>
        </div>
      </main>
    );
  }

  // Determine if viewer is a follower
  let isFollower = false;
  let hasPendingRequest = false;
  if (currentUser && !isOwner) {
    const [{ data: followRow }, { data: reqRow }] = await Promise.all([
      supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", profile.id)
        .maybeSingle(),
      supabase
        .from("follow_requests")
        .select("id")
        .eq("requester_id", currentUser.id)
        .eq("target_id", profile.id)
        .eq("status", "pending")
        .maybeSingle(),
    ]);
    isFollower = !!followRow;
    hasPendingRequest = !!reqRow;
  }

  const viewerOpts = { isOwner, isFollower, isAdmin };

  // Followers-only: non-followers see limited view
  const canSeeContent =
    isOwner || isAdmin || accountMode === "public" || (accountMode === "followers_only" && isFollower);
  const canSeePersonalDetails = canView(extendedVisibility.personal_details, viewerOpts);
  const canSeeExtended = canView(extendedVisibility.extended_details, viewerOpts);
  const canSeePosts = canView(extendedVisibility.community_posts, viewerOpts) && canSeeContent;

  // Follower/following counts visibility
  const showFollowersList = canView(privacySettings.show_followers_list as "everyone" | "followers" | "only_me", viewerOpts);
  const showFollowingList = canView(privacySettings.show_following_list as "everyone" | "followers" | "only_me", viewerOpts);

  const [
    { count: followerCount },
    { count: followingCount },
    { data: rawPosts },
  ] = await Promise.all([
    showFollowersList
      ? supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id)
      : Promise.resolve({ count: null }),
    showFollowingList
      ? supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id)
      : Promise.resolve({ count: null }),
    canSeePosts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from("posts") as any)
          .select(POST_SELECT)
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts: PostData[] = ((rawPosts ?? []) as any[]).map((p) => normalisePost(p));

  let userReactionsMap = new Map<string, string>();
  if (currentUser && posts.length > 0) {
    const { data: reactions } = await supabase
      .from("reactions")
      .select("post_id, emoji")
      .eq("user_id", currentUser.id)
      .not("post_id", "is", null)
      .in("post_id", posts.map((p) => p.id));
    userReactionsMap = new Map(
      (reactions ?? []).filter((r) => r.post_id).map((r) => [r.post_id as string, r.emoji])
    );
  }

  const displayName = getDisplayName(profile);

  return (
    <main className="min-h-screen" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/community"
          className="inline-block text-sm mb-8 hover:underline transition-colors"
          style={{ color: "var(--nrs-text-muted)" }}
        >
          ← Community
        </Link>

        {/* Profile header */}
        <div className="flex items-start gap-6 mb-10">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-700 flex items-center justify-center text-2xl font-semibold shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold flex items-center gap-2 flex-wrap">
                {displayName}
                <MemberBadge role={profile.role} tier={profile.tier} />
              </h1>
              {isOwner ? (
                <Link
                  href="/account/profile"
                  className="text-sm px-3 py-1.5 rounded-lg transition"
                  style={{ background: "var(--nrs-btn-bg)", color: "var(--nrs-text-body)", border: "1px solid var(--nrs-btn-border)" }}
                >
                  Edit profile
                </Link>
              ) : currentUser ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <FollowButton
                    targetUserId={profile.id}
                    initialFollowing={isFollower}
                    currentUserId={currentUser.id}
                    targetAccountMode={accountMode}
                    initialRequestPending={hasPendingRequest}
                  />
                  {/* Message button: only visible between admins/super_admins */}
                  {isAdmin && (profile.role === "admin" || profile.role === "super_admin") && (
                    <MessageButton
                      targetUserId={profile.id}
                      messagingDisabled={(profile as { messaging_disabled?: boolean | null }).messaging_disabled ?? false}
                      viewerRole={viewerRole!}
                    />
                  )}
                </div>
              ) : null}
            </div>

            {profile.username && (
              <div className="text-sm mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>@{profile.username}</div>
            )}

            {/* Account mode badge */}
            {accountMode !== "public" && (
              <div className="mt-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={
                    accountMode === "followers_only"
                      ? { background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }
                      : { background: "var(--nrs-panel)", color: "var(--nrs-text-muted)" }
                  }
                >
                  {accountMode === "followers_only" ? "Followers only" : "Private"}
                </span>
              </div>
            )}

            {canSeePersonalDetails && profile.bio && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--nrs-text-body)" }}>{profile.bio}</p>
            )}

            {profile.member_id != null && (
              <div className="mt-2 text-xs font-mono" style={{ color: "var(--nrs-text-muted)" }}>
                #{String(profile.member_id).padStart(11, "0")}
              </div>
            )}

            <div className="mt-3 flex gap-6 text-sm">
              <div>
                <span className="font-semibold">{canSeePosts ? posts.length : "—"}</span>{" "}
                <span style={{ color: "var(--nrs-text-muted)" }}>posts</span>
              </div>
              {showFollowersList ? (
                <div>
                  <span className="font-semibold">{followerCount ?? 0}</span>{" "}
                  <span style={{ color: "var(--nrs-text-muted)" }}>followers</span>
                </div>
              ) : null}
              {showFollowingList ? (
                <div>
                  <span className="font-semibold">{followingCount ?? 0}</span>{" "}
                  <span style={{ color: "var(--nrs-text-muted)" }}>following</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Followers-only gate message */}
        {accountMode === "followers_only" && !canSeeContent && !isOwner && (
          <div className="rounded-xl p-10 text-center mb-8" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--nrs-text-muted)" }}>This account is followers only</p>
            <p className="text-xs mt-1" style={{ color: "var(--nrs-text-muted)" }}>
              Follow this member to see their posts and profile details.
            </p>
          </div>
        )}

        {/* Posts */}
        {canSeePosts && (
          posts.length === 0 ? (
            <p className="text-center py-16 text-sm" style={{ color: "var(--nrs-text-muted)" }}>No posts yet.</p>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
              {posts.map((post) => (
                <div key={post.id} className="break-inside-avoid mb-4">
                  <PostCard
                    post={post}
                    userReaction={userReactionsMap.get(post.id) ?? null}
                    isFollowing={isFollower}
                    currentUserId={currentUser?.id ?? null}
                  />
                </div>
              ))}
            </div>
          )
        )}
      </div>
      <BackToTop />
    </main>
  );
}
