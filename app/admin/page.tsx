import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { products } from "@/lib/products";
import AdminTabs from "./AdminTabs";
import type { FlagRecord, MemberRecord, WarningRecord } from "./AdminTabs";

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
      <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-neutral-400 text-sm">
            Your account does not have admin permissions.
          </p>
          {!user && (
            <Link href="/auth/login" className="mt-4 inline-block text-sm text-amber-400 hover:underline">
              Sign in
            </Link>
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
  ] = await Promise.all([
    admin
      .from("posts")
      .select("id, type, content, image_url, categories, created_at, profiles(full_name, username)")
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("comments")
      .select("id, content, created_at, profiles(full_name, username), post_id")
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
      .select("id, member_id, full_name, username, role, status, created_at"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
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
    };
  });
  members.sort((a, b) => (a.member_id ?? 99999999999) - (b.member_id ?? 99999999999));

  // ── Build flagged posts list ─────────────────────────────────
  const flagPostIds = rawFlags?.map((f) => f.post_id) ?? [];
  let flagPostMap: Record<string, { type: string; content: string | null; image_url: string | null; profiles: unknown }> = {};
  if (flagPostIds.length > 0) {
    const { data: fps } = await admin
      .from("posts")
      .select("id, type, content, image_url, profiles(full_name, username)")
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
      post_author:
        (author as { full_name?: string | null; username?: string | null } | null)?.full_name ||
        (author as { full_name?: string | null; username?: string | null } | null)?.username ||
        "Unknown",
    };
  });

  // ── Build warnings list ──────────────────────────────────────
  const warningProfileIds = [
    ...new Set([
      ...(rawWarnings?.map((w) => w.user_id) ?? []),
      ...(rawWarnings?.map((w) => w.sent_by).filter(Boolean) ?? []),
    ]),
  ];
  let wpMap: Record<string, { full_name: string | null; username: string | null; member_id: number | null }> = {};
  if (warningProfileIds.length > 0) {
    const { data: wProfiles } = await admin
      .from("profiles")
      .select("id, full_name, username, member_id")
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
      recipient_name: recip?.full_name || recip?.username || "Unknown",
      recipient_member_id: recip?.member_id ?? null,
      sender_name: sender?.full_name || sender?.username || "Admin",
    };
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">SONCAR Admin</h1>
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
          <Link href="/" className="text-sm px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            View site
          </Link>
        </div>

        {/* Products */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Products</h2>
          <p className="text-neutral-400 text-sm mb-4">
            Product descriptions are managed in{" "}
            <code className="text-neutral-200">lib/products.ts</code>.
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
            members={members}
            warnings={warnings}
          />
        </section>
      </div>
    </main>
  );
}
