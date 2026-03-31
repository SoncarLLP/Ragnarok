import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { products } from "@/lib/products";
import AdminTabs from "./AdminTabs";
import type { FlagRecord, MemberRecord, WarningRecord } from "./AdminTabs";
import type { BlockAuthRecord, MemberOption } from "./BlockAuthTab";
import type { PinnedPostRecord } from "./PinnedPostsTab";
import { getDisplayName } from "@/lib/display-name";

export default async function AdminPage() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <p className="text-neutral-400">SUPABASE_SERVICE_ROLE_KEY not configured.</p>
      </main>
    );
  }

  // Get the current logged-in user and their role
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Determine current admin's role (or deny access)
  let currentUserRole: "admin" | "super_admin" | null = null;
  if (user) {
    const { data: myProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (myProfile?.role === "admin" || myProfile?.role === "super_admin") {
      currentUserRole = myProfile.role as "admin" | "super_admin";
    }
  }

  if (!currentUserRole) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          {!user ? (
            <>
              <p className="text-lg font-semibold mb-2">Sign in required</p>
              <p className="text-neutral-400 text-sm mb-5">
                You need to be signed in to your Ragnarök account before accessing the admin panel.
              </p>
              <Link
                href="/auth/login"
                className="inline-block px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition"
              >
                Sign in to your account →
              </Link>
              <p className="mt-4 text-xs text-neutral-500">
                After signing in, return to this page and enter the admin credentials again.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold mb-2">Access Denied</p>
              <p className="text-neutral-400 text-sm">
                Your account ({user.email}) does not have admin permissions.
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  // ── Fetch all admin data in parallel ────────────────────────
  const [
    { data: rawPosts },
    { data: rawComments },
    { data: rawFlags },
    { data: rawWarnings },
    { data: profileRows },
    authUsersResult,
    { data: rawBlockAuths },
    { data: rawPinnedPosts },
    { count: pendingMessageReports },
  ] = await Promise.all([
    admin
      .from("posts")
      .select("id, type, content, image_url, categories, created_at, profiles!posts_user_id_fkey(full_name, username, display_name_preference)")
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("comments")
      .select("id, content, created_at, profiles!comments_user_id_fkey(full_name, username, display_name_preference), post_id")
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("post_flags")
      .select("id, post_id, reason, created_at")
      .is("cleared_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("member_warnings")
      .select("id, message, created_at, read_at, user_id, sent_by")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("profiles")
      .select("id, member_id, full_name, username, role, status, created_at, tier, moderation_strikes"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    currentUserRole === "super_admin"
      ? admin
          .from("admin_block_authorisations")
          .select("id, super_admin_id, member_id, blocked_admin_id, reason, created_at, revoked_at")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    // Fetch all currently pinned Ragnarök Team posts
    admin
      .from("posts")
      .select("id, type, content, categories, created_at, pinned_until, pin_indefinite, created_by_user_id")
      .not("post_as_role", "is", null)
      .or("pin_indefinite.eq.true,pinned_until.gt." + new Date().toISOString())
      .order("created_at", { ascending: false }),
    // Pending message reports count (super admin only)
    currentUserRole === "super_admin"
      ? admin
          .from("conversation_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);

  // ── Build members list ───────────────────────────────────────
  const authUsers = authUsersResult.data?.users ?? [];
  const members: MemberRecord[] = authUsers.map((u) => {
    const p = profileRows?.find((pr) => pr.id === u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      member_id: p?.member_id ?? null,
      full_name: p?.full_name ?? null,
      username: p?.username ?? null,
      role: (p?.role ?? "member") as MemberRecord["role"],
      status: (p?.status ?? "active") as MemberRecord["status"],
      created_at: (p?.created_at ?? u.created_at) as string,
      tier: p?.tier ?? "Bronze 1",
      moderation_strikes: p?.moderation_strikes ?? 0,
    };
  });
  members.sort((a, b) => (a.member_id ?? 99999999999) - (b.member_id ?? 99999999999));

  // ── Build flagged posts list ─────────────────────────────────
  const flagPostIds = rawFlags?.map((f) => f.post_id) ?? [];
  const flagPostMap: Record<string, { type: string; content: string | null; image_url: string | null; profiles: unknown }> = {};
  if (flagPostIds.length > 0) {
    const { data: fps } = await admin
      .from("posts")
      .select("id, type, content, image_url, profiles!posts_user_id_fkey(full_name, username, display_name_preference)")
      .in("id", flagPostIds);
    for (const fp of fps ?? []) {
      flagPostMap[fp.id] = fp;
    }
  }

  const flags: FlagRecord[] = (rawFlags ?? []).map((f) => {
    const fp = flagPostMap[f.post_id];
    const prof = fp?.profiles;
    const author = Array.isArray(prof) ? prof[0] : prof;
    return {
      id: f.id,
      post_id: f.post_id,
      reason: f.reason ?? null,
      created_at: f.created_at,
      post_content: (fp?.content as string | null) ?? null,
      post_type: (fp?.type as string) ?? "text",
      post_image_url: (fp?.image_url as string | null) ?? null,
      post_author: author
        ? getDisplayName(author as { full_name?: string | null; username?: string | null; display_name_preference?: string | null })
        : "Unknown",
    };
  });

  // ── Build warnings list ──────────────────────────────────────
  const warningProfileIds = [
    ...new Set([
      ...(rawWarnings?.map((w) => w.user_id) ?? []),
      ...(rawWarnings?.map((w) => w.sent_by).filter(Boolean) ?? []),
    ]),
  ];
  const wpMap: Record<string, { full_name: string | null; username: string | null; member_id: number | null; display_name_preference?: string | null }> = {};
  if (warningProfileIds.length > 0) {
    const { data: wProfiles } = await admin
      .from("profiles")
      .select("id, full_name, username, member_id, display_name_preference")
      .in("id", warningProfileIds);
    for (const wp of wProfiles ?? []) {
      wpMap[wp.id] = wp;
    }
  }

  const warnings: WarningRecord[] = (rawWarnings ?? []).map((w) => {
    const recip = wpMap[w.user_id];
    const sender = w.sent_by ? wpMap[w.sent_by] : null;
    return {
      id: w.id,
      message: w.message,
      created_at: w.created_at,
      read_at: w.read_at ?? null,
      recipient_name: recip ? getDisplayName(recip) : "Unknown",
      recipient_member_id: recip?.member_id ?? null,
      sender_name: sender ? getDisplayName(sender) : "Admin",
    };
  });

  // ── Build block auth data (super_admin only) ─────────────────
  let blockAuths: BlockAuthRecord[] = [];
  let allMemberOptions: MemberOption[] = [];
  let adminOptions: MemberOption[] = [];

  if (currentUserRole === "super_admin" && rawBlockAuths && rawBlockAuths.length > 0) {
    const authProfileIds = [
      ...new Set([
        ...rawBlockAuths.map((a) => a.super_admin_id),
        ...rawBlockAuths.map((a) => a.member_id),
        ...rawBlockAuths.map((a) => a.blocked_admin_id),
      ]),
    ];
    const { data: authProfiles } = await admin
      .from("profiles")
      .select("id, full_name, username")
      .in("id", authProfileIds);
    const apMap: Record<string, { full_name: string | null; username: string | null }> = {};
    for (const ap of authProfiles ?? []) apMap[ap.id] = ap;

    blockAuths = rawBlockAuths.map((a) => {
      const m = apMap[a.member_id];
      const ba = apMap[a.blocked_admin_id];
      const sa = apMap[a.super_admin_id];
      return {
        id: a.id,
        member_name: m?.full_name || m?.username || "Unknown",
        member_username: m?.username ?? null,
        blocked_admin_name: ba?.full_name || ba?.username || "Unknown",
        blocked_admin_username: ba?.username ?? null,
        super_admin_name: sa?.full_name || sa?.username || "Super Admin",
        reason: a.reason ?? null,
        created_at: a.created_at,
        revoked_at: a.revoked_at ?? null,
      };
    });
  }

  if (currentUserRole === "super_admin") {
    allMemberOptions = (profileRows ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name ?? null,
      username: p.username ?? null,
      role: p.role ?? "member",
    }));
    adminOptions = allMemberOptions.filter((m) => m.role === "admin");
  }

  // ── Build pinned posts list ──────────────────────────────────
  // For super_admins, resolve creator names from created_by_user_id
  let pinnedPosts: PinnedPostRecord[] = [];
  if (rawPinnedPosts && rawPinnedPosts.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typed = rawPinnedPosts as any[];

    if (currentUserRole === "super_admin") {
      const creatorIds = [
        ...new Set(typed.map((p) => p.created_by_user_id).filter(Boolean)),
      ] as string[];
      const creatorMap: Record<string, { full_name: string | null; username: string | null }> = {};
      if (creatorIds.length > 0) {
        const { data: creatorProfiles } = await admin
          .from("profiles")
          .select("id, full_name, username")
          .in("id", creatorIds);
        for (const cp of creatorProfiles ?? []) creatorMap[cp.id] = cp;
      }
      pinnedPosts = typed.map((p) => {
        const creator = p.created_by_user_id ? creatorMap[p.created_by_user_id] : null;
        return {
          id: p.id,
          type: p.type,
          content: p.content ?? null,
          categories: p.categories ?? [],
          created_at: p.created_at,
          pinned_until: p.pinned_until ?? null,
          pin_indefinite: p.pin_indefinite ?? false,
          creator_name: creator ? (creator.full_name || creator.username || null) : null,
          creator_username: creator?.username ?? null,
        };
      });
    } else {
      pinnedPosts = typed.map((p) => ({
        id: p.id,
        type: p.type,
        content: p.content ?? null,
        categories: p.categories ?? [],
        created_at: p.created_at,
        pinned_until: p.pinned_until ?? null,
        pin_indefinite: p.pin_indefinite ?? false,
        creator_name: null,
        creator_username: null,
      }));
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">Ragnarök Admin</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                currentUserRole === "super_admin"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-emerald-500/15 text-emerald-400"
              }`}
            >
              {currentUserRole}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {currentUserRole === "super_admin" && (
              <Link href="/site-management" className="text-sm px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200">
                Site Management ⚙️
              </Link>
            )}
            <Link href="/" className="text-sm px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
              View site
            </Link>
          </div>
        </div>

        {/* Products */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Products</h2>
          <p className="text-neutral-400 text-sm mb-4">
            Products are managed in{" "}
            {currentUserRole === "super_admin" ? (
              <Link href="/site-management/products" className="text-amber-300 hover:underline">
                Site Management → Products
              </Link>
            ) : (
              <span className="text-neutral-300">Site Management (super admin only)</span>
            )}.
          </p>
          <div className="space-y-3">
            {products.map((p) => (
              <div
                key={p.slug}
                className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm text-neutral-400">{p.slug}</div>
                  <div className="font-medium">{p.name}</div>
                  <div className="mt-1 text-sm text-neutral-300">{p.blurb}</div>
                </div>
                <Link
                  href={`/product/${p.slug}`}
                  className="shrink-0 text-xs text-neutral-400 hover:text-white"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Community + Members moderation */}
        <section>
          <h2 className="text-lg font-semibold mb-6">Community &amp; Members</h2>
          <AdminTabs
            currentUserRole={currentUserRole}
            posts={rawPosts ?? []}
            comments={rawComments ?? []}
            flags={flags}
            pinnedPosts={pinnedPosts}
            blockAuths={blockAuths}
            allMemberOptions={allMemberOptions}
            adminOptions={adminOptions}
            members={members}
            warnings={warnings}
            pendingMessageReports={pendingMessageReports ?? 0}
          />
        </section>
      </div>
    </main>
  );
}
