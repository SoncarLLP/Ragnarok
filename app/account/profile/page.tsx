import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, username, bio, avatar_url, member_id, gender, pronouns, location_text, date_of_birth, nationality, website, display_name_preference")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Manage your account details and public community profile
      </p>

      <div className="mt-6 max-w-md space-y-6">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Email</div>
          <div className="text-sm">{user.email}</div>
          <div className="text-xs text-neutral-500 mt-1">
            Email address cannot be changed here
          </div>
        </div>

        {profile?.member_id != null && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Member ID</div>
            <div className="font-mono text-sm text-neutral-300">
              {String(profile.member_id).padStart(11, "0")}
            </div>
          </div>
        )}

        {profile?.username && (
          <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-4">
            <div className="text-xs text-neutral-400 mb-1">Your public profile</div>
            <a
              href={`/account/profile/${profile.username}`}
              className="text-sm text-amber-400 hover:underline"
            >
              /account/profile/{profile.username}
            </a>
          </div>
        )}

        <ProfileForm
          initialFullName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
          initialUsername={profile?.username ?? ""}
          initialBio={profile?.bio ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? ""}
          initialGender={profile?.gender ?? ""}
          initialPronouns={profile?.pronouns ?? ""}
          initialLocation={profile?.location_text ?? ""}
          initialDateOfBirth={profile?.date_of_birth ?? ""}
          initialNationality={profile?.nationality ?? ""}
          initialWebsite={profile?.website ?? ""}
          initialDisplayNamePreference={profile?.display_name_preference ?? "username"}
        />
      </div>
    </div>
  );
}
