import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/search?q=query&type=all|products|posts|members&limit=5&offset=0
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawQuery = (searchParams.get("q") ?? "").trim();
  const type     = searchParams.get("type") ?? "all";
  const limit    = Math.min(parseInt(searchParams.get("limit")  ?? "5"), 50);
  const offset   = parseInt(searchParams.get("offset") ?? "0");

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
    userRole = (profile?.role as "member" | "admin" | "super_admin" | null) ?? "member";
  }
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const similarityThreshold = isAdmin ? 0.10 : 0.15;

  // Safe query for ILIKE fallback (strip special chars)
  const safeQ = rawQuery.replace(/[^\w\s]/g, " ").trim();

  // Expand query with synonyms
  const expandedTerms = await expandWithSynonyms(admin, safeQ);

  const results: {
    products: SearchResult[];
    posts:    SearchResult[];
    members:  SearchResult[];
  } = { products: [], posts: [], members: [] };

  // ── Products ───────────────────────────────────────────────
  if (type === "all" || type === "products") {
    const seen = new Set<string>();
    const productRows: ProductRow[] = [];

    for (const term of expandedTerms) {
      const { data, error } = await admin.rpc("fuzzy_search_products", {
        query_text:           term,
        similarity_threshold: similarityThreshold,
        limit_count:          limit * 2,
        offset_count:         0,
      });

      if (error) {
        // RPC not available — fall back to ILIKE
        const { data: fallback } = await admin
          .from("products")
          .select("id, slug, name, description_html, price_pence, primary_image_url")
          .eq("visibility", "published")
          .or(`name.ilike.%${term}%,description_html.ilike.%${term}%,slug.ilike.%${term}%`)
          .limit(limit);
        for (const p of fallback ?? []) {
          if (!seen.has(p.id)) { seen.add(p.id); productRows.push({ ...p, match_rank: 0.1 }); }
        }
      } else {
        for (const p of data ?? []) {
          if (!seen.has(p.id)) { seen.add(p.id); productRows.push(p as ProductRow); }
        }
      }
    }

    // Sort by match_rank descending, take limit
    productRows.sort((a, b) => (b.match_rank ?? 0) - (a.match_rank ?? 0));
    results.products = productRows.slice(offset, offset + limit).map((p) => ({
      id:      p.id,
      type:    "product" as const,
      title:   p.name,
      excerpt: stripHtml(p.description_html ?? "").slice(0, 120),
      url:     `/product/${p.slug}`,
      image:   p.primary_image_url ?? null,
      meta:    `£${(p.price_pence / 100).toFixed(2)}`,
    }));
  }

  // ── Community posts ────────────────────────────────────────
  if (type === "all" || type === "posts") {
    const seen = new Set<string>();
    type PostRow = {
      id: string; content: string | null; categories: string[];
      created_at: string; type: string; user_id: string; match_rank?: number;
      profiles?: { username: string | null; full_name: string | null; display_name_preference: string | null; privacy_mode: string | null } | null;
    };
    const postRows: PostRow[] = [];

    for (const term of expandedTerms) {
      const { data, error } = await admin.rpc("fuzzy_search_posts", {
        query_text:           term,
        similarity_threshold: similarityThreshold,
        limit_count:          limit * 2,
        offset_count:         0,
      });

      if (error) {
        // Fallback: ILIKE
        const { data: fallback } = await admin
          .from("posts")
          .select("id, content, categories, created_at, type, user_id, profiles!posts_user_id_fkey(username, full_name, display_name_preference, privacy_mode)")
          .not("content", "is", null)
          .ilike("content", `%${term}%`)
          .order("created_at", { ascending: false })
          .limit(limit);
        for (const p of (fallback ?? []) as unknown as PostRow[]) {
          if (!seen.has(p.id)) { seen.add(p.id); postRows.push({ ...p, match_rank: 0.1 }); }
        }
      } else {
        // Need profiles — fetch them for the returned IDs
        const ids: string[] = (data ?? []).map((p: { id: string }) => p.id);
        if (ids.length > 0) {
          const { data: withProfiles } = await admin
            .from("posts")
            .select("id, content, categories, created_at, type, user_id, profiles!posts_user_id_fkey(username, full_name, display_name_preference, privacy_mode)")
            .in("id", ids);

          const rankMap: Record<string, number> = {};
          for (const p of data ?? []) rankMap[(p as { id: string; match_rank: number }).id] = (p as { id: string; match_rank: number }).match_rank;

          for (const p of (withProfiles ?? []) as unknown as PostRow[]) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              postRows.push({ ...p, match_rank: rankMap[p.id] ?? 0.1 });
            }
          }
        }
      }
    }

    postRows.sort((a, b) => (b.match_rank ?? 0) - (a.match_rank ?? 0));

    results.posts = postRows.slice(offset, offset + limit).flatMap((p) => {
      const prof = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as { username: string | null; full_name: string | null; privacy_mode: string | null } | null;
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

  // ── Members ────────────────────────────────────────────────
  if ((type === "all" || type === "members") && user) {
    const seen = new Set<string>();
    type MemberRow = {
      id: string; full_name: string | null; username: string | null;
      avatar_url: string | null; tier: string | null; privacy_mode: string | null;
      bio?: string | null; display_name_preference?: string | null; match_rank?: number;
    };
    const memberRows: MemberRow[] = [];

    for (const term of expandedTerms) {
      const { data, error } = await admin.rpc("fuzzy_search_members", {
        query_text:           term,
        similarity_threshold: similarityThreshold,
        limit_count:          limit * 2,
        offset_count:         0,
      });

      if (error) {
        const { data: fallback } = await admin
          .from("profiles")
          .select("id, full_name, username, avatar_url, tier, privacy_mode, display_name_preference")
          .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
          .limit(limit);
        for (const m of (fallback ?? []) as MemberRow[]) {
          if (!seen.has(m.id)) { seen.add(m.id); memberRows.push({ ...m, match_rank: 0.1 }); }
        }
      } else {
        for (const m of (data ?? []) as MemberRow[]) {
          if (!seen.has(m.id)) { seen.add(m.id); memberRows.push(m); }
        }
      }
    }

    memberRows.sort((a, b) => (b.match_rank ?? 0) - (a.match_rank ?? 0));

    results.members = memberRows.slice(offset, offset + limit).flatMap((m) => {
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

  // Did you mean (only when zero results)
  let didYouMean: string | null = null;
  if (total === 0 && safeQ.length >= 3) {
    const { data: suggestion } = await admin.rpc("search_did_you_mean", {
      query_text: safeQ,
    });
    if (suggestion && suggestion.toLowerCase() !== safeQ.toLowerCase()) {
      didYouMean = suggestion as string;
    }
  }

  // Log the search (best-effort, non-blocking)
  try {
    await admin.from("search_logs").insert({
      query:        rawQuery,
      result_count: total,
      user_id:      user?.id ?? null,
    });
  } catch { /* ignore logging errors */ }

  return NextResponse.json({ ...results, total, query: rawQuery, ...(didYouMean ? { didYouMean } : {}) });
}

// ── Helpers ────────────────────────────────────────────────

async function expandWithSynonyms(
  admin: ReturnType<typeof createAdminClient>,
  query: string
): Promise<string[]> {
  const lq = query.toLowerCase();
  try {
    const { data: rows } = await admin.from("search_synonyms").select("term, synonyms");
    const expanded: string[] = [query];
    for (const row of rows ?? []) {
      const term = (row.term as string).toLowerCase();
      const syns = row.synonyms as string[];
      if (term === lq) {
        // query matches a term — add its synonyms
        for (const s of syns) if (!expanded.some((e) => e.toLowerCase() === s.toLowerCase())) expanded.push(s);
      } else if (syns.some((s) => s.toLowerCase() === lq)) {
        // query matches a synonym — add the canonical term + other synonyms
        if (!expanded.some((e) => e.toLowerCase() === term)) expanded.push(row.term as string);
      }
    }
    return expanded.slice(0, 5); // cap at 5 expansion terms to keep queries fast
  } catch {
    return [query];
  }
}

type ProductRow = {
  id: string; slug: string; name: string;
  description_html: string | null; price_pence: number;
  primary_image_url: string | null; match_rank?: number;
};

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
