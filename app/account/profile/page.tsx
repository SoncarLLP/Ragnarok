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
    .select("full_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-1 text-sm text-neutral-400">Manage your account details</p>

      <div className="mt-6 max-w-md space-y-6">
        {/* Email (read-only) */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Email</div>
          <div className="text-sm">{user.email}</div>
          <div className="text-xs text-neutral-500 mt-1">
            Email address cannot be changed here
          </div>
        </div>

        {/* Editable fields */}
        <ProfileForm
          initialFullName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
        />
      </div>
    </div>
  );
}
