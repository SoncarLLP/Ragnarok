import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_CREDENTIALS = [
  { user: process.env.ADMIN_USERNAME || "", pass: process.env.ADMIN_PASSWORD || "" },
  { user: process.env.ADMIN_USERNAME_2 || "", pass: process.env.ADMIN_PASSWORD_2 || "" },
].filter((c) => c.user && c.pass);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin routes: basic auth only ─────────────────────────
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (ADMIN_CREDENTIALS.length === 0) {
      return NextResponse.json({ error: "Admin credentials not configured" }, { status: 500 });
    }
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Basic ")) {
      return new NextResponse("Auth required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="SONCAR Admin"' },
      });
    }
    const [, b64] = auth.split(" ");
    const [user, pass] = Buffer.from(b64, "base64").toString().split(":");
    const valid = ADMIN_CREDENTIALS.some((c) => c.user === user && c.pass === pass);
    if (!valid) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return NextResponse.next();
  }

  // ── All other routes: refresh Supabase session ─────────────
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /account — redirect unauthenticated users to login
  if (pathname.startsWith("/account") && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === "/auth/login" || pathname === "/auth/signup") && user) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
