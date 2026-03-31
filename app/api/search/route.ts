import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/search?q=query&type=all|products|posts|members&limit=5&offset=0
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawQuery = (searchParams.get("q") ?? "").trim();
  const type   = searchParams.get("type") ?? "all";
  const limit  = Math.min(parseInt(searchParams.get("limit")  ?? "5"),  50);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  if (!rawQuery || rawQuery.length < 2) {
    return NextResponse.json({ products: [], posts: [], members: [], total: 0 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Determine role
  let userRole: "member" | "admin" | "super_admin" | null = null;
  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    userRole = (profile?.role as typeof userRole) ?? "member";
  }

  const isAdmin = userRole === "admin" || userRole === "super_admin";

  // Build a safe tsquery from the raw string
  // Replace special chars and wrap in plainto_tsquery for safety
  const safeQ = rawQuery.replace(/[^\w\s]/g, " ").trim();

  const results: {
    products: SearchResult[];
    posts:    SearchResult[];
    members:  SearchResult[];
  } = { products: [], posts: [], members: [] };

  // ── Products (accessible to everyone) ─────────────────────────
  if (type === "all" || type === "products") {
    const { data: products } = await admin
      .from("products")
      .select("id, slug, name, description_html, price_pence, primary_image_url")
      .eq("visibility", "published")
      .or(
        `name.ilike.%${safeQ}%,description_html.ilike.%${safeQ}%`
      )
      .limit(limit)
      .range(offset, offset + limit - 1);

    results.products = (products ?? []).map((p) => ({
      id:      p.id,
      type:    "product" as const,
      title:   p.name,
      excerpt: stripHtml(p.description_html ?? "").slice(0, 120),
      url:     `/product/${p.slug}`,
      image:   p.primary_image_url ?? null,
      meta:    `£${(p.price_pence / 100).toFixed(2)}`,
    }));
  }

  // ── Community posts (public + members only based on privacy) ──
  if (type === "all" || type === "posts") {
    const postsQuery = admin
      .from("posts")
      .select("id, content, categories, created_at, type, profiles!posts_user_id_fkey(username, full_name, display_name_preference, privacy_mode)")
      .not("content", "is", null)
      .ilike("content", `%${safeQ}%`)
      .order("created_at", { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    const { data: posts } = await postsQuery;

    results.posts = (posts ?? []).flatMap((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prof = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as any;
      // Private mode posts are visible to admins only
      if (!isAdmin && prof?.privacy_mode === "private") return [];
      const authorName = prof?.full_name || prof?.username || "Unknown";
      return [{
        id:      p.id,
        type:    "post" as const,
        title:   `Post by ${authorName}`,
        excerpt: (p.content ?? "").slice(0, 120),
        url:     `/community/${p.id}`,
        image:   null,
        meta:    new Date(p.created_at).toLocaleDateString("en-GB"),
      }];
    });
  }

  // ── Members (members+ only; respects privacy settings) ────────
  if ((type === "all" || type === "members") && user) {
    const membersQuery = admin
      .from("profiles")
      .select("id, full_name, username, avatar_url, tier, privacy_mode, display_name_preference")
      .or(
        `full_name.ilike.%${safeQ}%,username.ilike.%${safeQ}%`
      )
      .limit(limit)
      .range(offset, offset + limit - 1);

    const { data: members } = await membersQuery;

    results.members = (members ?? []).flatMap((m) => {
      // Respect privacy: private members only visible to admins
      if (!isAdmin && m.privacy_mode === "private") return [];
      const displayName = m.full_name || m.username || "Member";
      return [{
        id:      m.id,
        type:    "member" as const,
        title:   displayName,
        excerpt: m.username ? `@${m.username}` : "",
        url:     `/community?member=${m.username ?? m.id}`,
        image:   m.avatar_url ?? null,
        meta:    m.tier ?? "Bronze 1",
      }];
    });
  }

  const total = results.products.length + results.posts.length + results.members.length;
  return NextResponse.json({ ...results, total, query: rawQuery });
}

type SearchResult = {
  id:      string;
  type:    "product" | "post" | "member";
  title:   string;
  excerpt: string;
  url:     string;
  image:   string | null;
  meta:    string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
