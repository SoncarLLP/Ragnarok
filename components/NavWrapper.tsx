import { createClient } from "@/lib/supabase/server";
import NavSidebar from "./NavSidebar";

/**
 * Async server component — fetches the current user's role (if any)
 * and renders the NavSidebar client component with it.
 * Safe to use on any page; gracefully handles unauthenticated users.
 */
export default async function NavWrapper() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = data?.role ?? null;
  }

  return <NavSidebar role={role} />;
}
