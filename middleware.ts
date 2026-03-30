import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Admin dashboard Basic Auth ────────────────────────────
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const authHeader = request.headers.get("authorization");
    const expected =
      "Basic " +
      Buffer.from(
        `${process.env.ADMIN_USERNAME}:${process.env.ADMIN_PASSWORD}`
      ).toString("base64");

    if (!authHeader || authHeader !== expected) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="SONCAR Admin"' },
      });
    }
    return NextResponse.next();
  }

  // ── 2. Supabase session refresh ───────────────────────────────
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
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

  // ── 3. /site-management – super_admin only ────────────────────
  if (pathname.startsWith("/site-management") || pathname.startsWith("/api/site-management")) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check super_admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return new NextResponse("Access denied. Super admin only.", { status: 403 });
    }

    return response;
  }

  // ── 4. /account – must be signed in ──────────────────────────
  if (pathname.startsWith("/account")) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // ── 5. /auth/login or /auth/signup – redirect if signed in ───
  if (pathname === "/auth/login" || pathname === "/auth/signup") {
    if (user) {
      return NextResponse.redirect(new URL("/account", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/account/:path*",
    "/auth/login",
    "/auth/signup",
    "/site-management/:path*",
    "/api/site-management/:path*",
  ],
};
