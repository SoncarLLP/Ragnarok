import { createClient } from "@/lib/supabase/server";
import NavSidebar from "./NavSidebar";

/**
 * Async server component — fetches the current user's profile (role, tier,
 * display name) and passes it to the NavSidebar client component.
 * Safe to use on any page; gracefully handles unauthenticated users.
 */
export default async function NavWrapper() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  let tier: string | null = null;
  let displayName: string | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, tier, full_name")
      .eq("id", user.id)
      .single();
    role = data?.role ?? null;
    tier = data?.tier ?? null;
    displayName = data?.full_name || user.email?.split("@")[0] || null;
  }

  return <NavSidebar role={role} tier={tier} displayName={displayName} />;
}
