import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AccountNav from "./AccountNav";
import LogoutButton from "./LogoutButton";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.full_name || user.email?.split("@")[0] || "Member";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-wide">
            SONCAR
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-400 hidden sm:block">{displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Mobile nav rendered above content */}
        <div className="md:hidden mb-2">
          <AccountNav />
        </div>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <AccountNav />
          </div>

          {/* Page content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
