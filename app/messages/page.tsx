import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/lib/display-name";
import MessagesClient from "./MessagesClient";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, avatar_url, display_name_preference, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "member";

  if (role !== "admin" && role !== "super_admin") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)" }}>
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold mb-2">Access Denied</p>
          <p className="text-sm mb-5" style={{ color: "var(--nrs-text-muted)" }}>
            The messaging system is restricted to admins only.
          </p>
          <Link
            href="/account"
            className="inline-block px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition"
          >
            Go to My Account
          </Link>
        </div>
      </main>
    );
  }

  const { conversation: initialConversationId } = await searchParams;
  const displayName = profile ? getDisplayName(profile) : user.email?.split("@")[0] ?? "Admin";

  return (
    <MessagesClient
      currentUser={{
        id: user.id,
        display_name: displayName,
        avatar_url: profile?.avatar_url ?? null,
        role,
      }}
      initialConversationId={initialConversationId ?? null}
    />
  );
}
