import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mergePrivacySettings, mergeExtendedVisibility } from "@/lib/privacy";
import PrivacyForm from "./PrivacyForm";
import UnblockButton from "./UnblockButton";

export default async function PrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: rawBlocked }] = await Promise.all([
    supabase
      .from("profiles")
      .select("account_mode, privacy_settings, extended_profile_visibility, role, messaging_disabled")
      .eq("id", user.id)
      .single(),
    supabase
      .from("blocks")
      .select("blocked_id, profiles!blocks_blocked_id_fkey(username, full_name, avatar_url)")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const privacySettings = mergePrivacySettings(profile?.privacy_settings);
  const extendedVisibility = mergeExtendedVisibility(profile?.extended_profile_visibility);
  const accountMode = (profile?.account_mode ?? "public") as "public" | "followers_only" | "private";

  type BlockedProfile = {
    blocked_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };

  const blockedMembers: BlockedProfile[] = (rawBlocked ?? []).map((b) => {
    const p = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    return {
      blocked_id: b.blocked_id,
      username: (p as { username?: string | null } | null)?.username ?? null,
      full_name: (p as { full_name?: string | null } | null)?.full_name ?? null,
      avatar_url: (p as { avatar_url?: string | null } | null)?.avatar_url ?? null,
    };
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">Privacy &amp; Safety</h1>
      <p className="text-sm text-neutral-400 mb-8">
        Control who can see your profile and interact with you on SONCAR
      </p>

      <PrivacyForm
        initialAccountMode={accountMode}
        initialPrivacySettings={privacySettings}
        initialExtendedVisibility={extendedVisibility}
        role={profile?.role ?? null}
        initialMessagingDisabled={(profile as { messaging_disabled?: boolean | null } | null)?.messaging_disabled ?? false}
      />

      {/* Blocked members */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-1">Blocked members</h2>
        <p className="text-sm text-neutral-400 mb-4">
          Blocked members cannot view your profile, mention you, or interact with your content.
        </p>

        {blockedMembers.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-neutral-400 text-sm">You have not blocked anyone.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedMembers.map((b) => {
              const name = b.full_name || b.username || "Member";
              return (
                <div
                  key={b.blocked_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {b.avatar_url ? (
                      <img
                        src={b.avatar_url}
                        alt={name}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-semibold shrink-0">
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{name}</div>
                      {b.username && (
                        <div className="text-xs text-neutral-500">@{b.username}</div>
                      )}
                    </div>
                  </div>
                  <UnblockButton blockedId={b.blocked_id} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
