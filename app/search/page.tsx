import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import NavWrapper from "@/components/NavWrapper";
import BackToTop from "@/components/BackToTop";

export const dynamic = "force-dynamic";

type SearchResult = {
  id:      string;
  type:    "product" | "post" | "member";
  title:   string;
  excerpt: string;
  url:     string;
  image:   string | null;
  meta:    string;
};

type PageProps = { searchParams: Promise<{ q?: string; type?: string; page?: string }> };

const ITEMS_PER_PAGE = 20;

const TYPE_LABELS: Record<string, string> = {
  all:      "All Results",
  products: "Products",
  posts:    "Posts",
  members:  "Members",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded px-0.5" style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

type ProductRow = {
  id: string; slug: string; name: string;
  description_html: string | null; price_pence: number;
  primary_image_url: string | null; match_rank?: number;
};

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
        for (const s of syns) if (!expanded.some((e) => e.toLowerCase() === s.toLowerCase())) expanded.push(s);
      } else if (syns.some((s) => s.toLowerCase() === lq)) {
        if (!expanded.some((e) => e.toLowerCase() === term)) expanded.push(row.term as string);
      }
    }
    return expanded.slice(0, 5);
  } catch {
    return [query];
  }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q: rawQ = "", type = "all", page: pageStr = "1" } = await searchParams;
  const query   = rawQ.trim();
  const pageNum = Math.max(1, parseInt(pageStr));
  const offset  = (pageNum - 1) * ITEMS_PER_PAGE;
  const safeQ   = query.replace(/[^\w\s]/g, " ").trim();

  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole: string | null = null;
  if (user) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    userRole = profile?.role ?? "member";
  }
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const similarityThreshold = isAdmin ? 0.10 : 0.15;

  const results: Record<string, SearchResult[]> = { products: [], posts: [], members: [] };
  let didYouMean: string | null = null;

  if (query.length >= 2) {
    // Expand with synonyms
    const expandedTerms = await expandWithSynonyms(admin, safeQ);

    // ── Products ──────────────────────────────────────────────
    if (type === "all" || type === "products") {
      const seen = new Set<string>();
      const productRows: ProductRow[] = [];

      for (const term of expandedTerms) {
        const { data, error } = await admin.rpc("fuzzy_search_products", {
          query_text:           term,
          similarity_threshold: similarityThreshold,
          limit_count:          type === "products" ? ITEMS_PER_PAGE * 2 : 10,
          offset_count:         0,
        });

        if (error) {
          const { data: fallback } = await admin
            .from("products")
            .select("id, slug, name, description_html, price_pence, primary_image_url")
            .eq("visibility", "published")
            .or(`name.ilike.%${term}%,description_html.ilike.%${term}%,slug.ilike.%${term}%`)
            .limit(type === "products" ? ITEMS_PER_PAGE : 5);
          for (const p of fallback ?? []) {
            if (!seen.has(p.id)) { seen.add(p.id); productRows.push({ ...p, match_rank: 0.1 }); }
          }
        } else {
          for (const p of (data ?? []) as ProductRow[]) {
            if (!seen.has(p.id)) { seen.add(p.id); productRows.push(p); }
          }
        }
      }

      productRows.sort((a, b) => (b.match_rank ?? 0) - (a.match_rank ?? 0));
      const page = type === "products" ? productRows.slice(offset, offset + ITEMS_PER_PAGE) : productRows.slice(0, 5);

      results.products = page.map((p) => ({
        id:      p.id,
        type:    "product",
        title:   p.name,
        excerpt: stripHtml(p.description_html ?? "").slice(0, 150),
        url:     `/product/${p.slug}`,
        image:   p.primary_image_url ?? null,
        meta:    `£${(p.price_pence / 100).toFixed(2)}`,
      }));
    }

    // ── Posts ─────────────────────────────────────────────────
    if (type === "all" || type === "posts") {
      type PostRow = {
        id: string; content: string | null; categories: string[];
        created_at: string; type: string; user_id: string; match_rank?: number;
        profiles?: unknown;
      };
      const seen = new Set<string>();
      const postRows: PostRow[] = [];

      for (const term of expandedTerms) {
        const { data, error } = await admin.rpc("fuzzy_search_posts", {
          query_text:           term,
          similarity_threshold: similarityThreshold,
          limit_count:          type === "posts" ? ITEMS_PER_PAGE * 2 : 10,
          offset_count:         0,
        });

        if (error) {
          const { data: fallback } = await admin
            .from("posts")
            .select("id, content, created_at, type, user_id, profiles!posts_user_id_fkey(username, full_name, display_name_preference, privacy_mode)")
            .not("content", "is", null)
            .ilike("content", `%${term}%`)
            .order("created_at", { ascending: false })
            .limit(type === "posts" ? ITEMS_PER_PAGE : 5);
          for (const p of (fallback ?? []) as PostRow[]) {
            if (!seen.has(p.id)) { seen.add(p.id); postRows.push({ ...p, match_rank: 0.1 }); }
          }
        } else {
          const ids: string[] = (data ?? []).map((p: { id: string }) => p.id);
          if (ids.length > 0) {
            const { data: withProfiles } = await admin
              .from("posts")
              .select("id, content, categories, created_at, type, user_id, profiles!posts_user_id_fkey(username, full_name, display_name_preference, privacy_mode)")
              .in("id", ids);

            const rankMap: Record<string, number> = {};
            for (const p of data ?? []) rankMap[(p as { id: string; match_rank: number }).id] = (p as { id: string; match_rank: number }).match_rank;

            for (const p of (withProfiles ?? []) as PostRow[]) {
              if (!seen.has(p.id)) {
                seen.add(p.id);
                postRows.push({ ...p, match_rank: rankMap[p.id] ?? 0.1 });
              }
            }
          }
        }
      }

      postRows.sort((a, b) => (b.match_rank ?? 0) - (a.match_rank ?? 0));
      const page = type === "posts" ? postRows.slice(offset, offset + ITEMS_PER_PAGE) : postRows.slice(0, 5);

      results.posts = page.flatMap((p) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prof = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as any;
        if (!isAdmin && prof?.privacy_mode === "private") return [];
        const authorName = prof?.full_name || prof?.username || "Member";
        return [{
          id:      p.id,
          type:    "post" as const,
          title:   `Post by ${authorName}`,
          excerpt: (p.content ?? "").slice(0, 150),
          url:     `/community/${p.id}`,
          image:   null,
          meta:    new Date(p.created_at).toLocaleDateString("en-GB"),
        }];
      });
    }

    // ── Members ───────────────────────────────────────────────
    if ((type === "all" || type === "members") && user) {
      type MemberRow = {
        id: string; full_name: string | null; username: string | null;
        avatar_url: string | null; tier: string | null; privacy_mode: string | null;
        match_rank?: number;
      };
      const seen = new Set<string>();
      const rankMap: Record<string, number> = {};
      const orderedIds: string[] = [];

      for (const term of expandedTerms) {
        const { data, error } = await admin.rpc("fuzzy_search_members", {
          query_text:           term,
          similarity_threshold: similarityThreshold,
          limit_count:          type === "members" ? ITEMS_PER_PAGE * 2 : 10,
          offset_count:         0,
        });

        if (error) {
          const { data: fallback } = await admin
            .from("profiles")
            .select("id, full_name, username, avatar_url, tier, privacy_mode")
            .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
            .limit(type === "members" ? ITEMS_PER_PAGE : 5);
          for (const m of (fallback ?? []) as MemberRow[]) {
            if (!seen.has(m.id)) {
              seen.add(m.id);
              orderedIds.push(m.id);
              rankMap[m.id] = m.match_rank ?? 0.1;
              // Store fallback row directly — already has full profile data
              // We'll re-fetch below to keep code consistent
            }
          }
        } else {
          for (const row of (data ?? []) as { id: string; match_rank: number }[]) {
            if (!seen.has(row.id)) {
              seen.add(row.id);
              orderedIds.push(row.id);
              rankMap[row.id] = row.match_rank;
            }
          }
        }
      }

      // Fetch full profile data including privacy_mode, tier, avatar_url
      const memberRows: MemberRow[] = [];
      if (orderedIds.length > 0) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("id, full_name, username, avatar_url, tier, privacy_mode")
          .in("id", orderedIds);
        for (const m of (profiles ?? []) as MemberRow[]) {
          memberRows.push({ ...m, match_rank: rankMap[m.id] ?? 0.1 });
        }
      }

      memberRows.sort((a, b) => (b.match_rank ?? 0) - (a.match_rank ?? 0));
      const page = type === "members" ? memberRows.slice(offset, offset + ITEMS_PER_PAGE) : memberRows.slice(0, 5);

      results.members = page.flatMap((m) => {
        if (!isAdmin && m.privacy_mode === "private") return [];
        return [{
          id:      m.id,
          type:    "member" as const,
          title:   m.full_name || m.username || "Member",
          excerpt: m.username ? `@${m.username}` : "",
          url:     `/community?member=${m.username ?? m.id}`,
          image:   m.avatar_url ?? null,
          meta:    m.tier ?? "Bronze 1",
        }];
      });
    }

    // ── Did you mean (zero results) ───────────────────────────
    const totalCount = results.products.length + results.posts.length + results.members.length;
    if (totalCount === 0 && safeQ.length >= 3) {
      try {
        const { data: suggestion } = await admin.rpc("search_did_you_mean", { query_text: safeQ });
        if (suggestion && (suggestion as string).toLowerCase() !== safeQ.toLowerCase()) {
          didYouMean = suggestion as string;
        }
      } catch { /* ignore */ }
    }

    // Log the search
    try {
      const totalForLog = results.products.length + results.posts.length + results.members.length;
      await admin.from("search_logs").insert({
        query:        query,
        result_count: totalForLog,
        user_id:      user?.id ?? null,
      });
    } catch { /* ignore */ }
  }

  const totalCount =
    results.products.length + results.posts.length + results.members.length;

  const activeResults: SearchResult[] =
    type === "all"
      ? [...results.products, ...results.posts, ...results.members]
      : (results[type] ?? []);

  const FILTER_TABS = [
    { key: "all",      label: "All",      count: totalCount },
    { key: "products", label: "Products", count: results.products.length },
    { key: "posts",    label: "Posts",    count: results.posts.length },
    { key: "members",  label: "Members",  count: results.members.length },
  ];

  return (
    <main style={{ background: "var(--nrs-bg)", color: "var(--nrs-text-body)", minHeight: "100vh" }}>
      {/* Header */}
      <header className="nrs-header sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/soncar-logo-ragnarok.png" alt="Ragnarök" width={48} height={48} className="h-7 w-auto" />
            <span className="font-semibold text-sm tracking-widest" style={{ fontFamily: "var(--font-heading)", color: "var(--nrs-accent)" }}>
              Ragnarök
            </span>
          </Link>
          <NavWrapper />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Search form */}
        <form method="GET" action="/search" className="mb-8">
          <div className="flex gap-2">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search products, posts, members…"
              className="flex-1 rounded-xl border px-4 py-3 text-sm outline-none focus:border-amber-400/40"
              style={{
                background: "var(--nrs-bg-2)",
                borderColor: "var(--nrs-border)",
                color: "var(--nrs-text-body)",
              }}
            />
            <button
              type="submit"
              className="nrs-btn nrs-btn-primary px-5 py-3 text-sm font-medium"
            >
              Search
            </button>
          </div>
        </form>

        {/* Heading */}
        {query && (
          <div className="mb-6">
            <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
              {TYPE_LABELS[type] ?? "Results"} for &ldquo;{query}&rdquo;
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--nrs-text-muted)" }}>
              {totalCount} result{totalCount !== 1 ? "s" : ""} found
            </p>
          </div>
        )}

        {/* Filter tabs */}
        {query && (
          <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
            {FILTER_TABS.map((tab) => (
              <Link
                key={tab.key}
                href={`/search?q=${encodeURIComponent(query)}&type=${tab.key}`}
                className="shrink-0 px-4 py-2 rounded-lg text-sm transition border"
            style={
              type === tab.key
                ? { background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)", borderColor: "var(--nrs-accent-border)" }
                : { background: "var(--nrs-card)", color: "var(--nrs-text-muted)", borderColor: "var(--nrs-border-subtle)" }
            }
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
              </Link>
            ))}
          </div>
        )}

        {/* No query */}
        {!query && (
          <div className="text-center py-16 text-sm" style={{ color: "var(--nrs-text-muted)" }}>
            Enter a search term above to find products, posts, and members.
          </div>
        )}

        {/* Zero results */}
        {query && activeResults.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <p className="text-4xl">🔍</p>
            <p className="text-lg font-medium" style={{ color: "var(--nrs-text)" }}>
              No results found for &ldquo;{query}&rdquo;
            </p>
            {didYouMean && (
              <p className="text-sm">
                <span style={{ color: "var(--nrs-text-muted)" }}>Did you mean </span>
                <Link
                  href={`/search?q=${encodeURIComponent(didYouMean)}&type=${type}`}
                  className="font-medium underline"
                  style={{ color: "var(--nrs-accent)" }}
                >
                  {didYouMean}
                </Link>
                <span style={{ color: "var(--nrs-text-muted)" }}>?</span>
              </p>
            )}
            <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>
              Try different keywords or browse our shop and community.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/#shop" className="nrs-btn nrs-btn-primary inline-block px-6 py-2.5 text-sm">
                Browse Products
              </Link>
              <Link href="/community" className="nrs-btn inline-block px-6 py-2.5 text-sm">
                Browse Community
              </Link>
            </div>
          </div>
        )}

        {/* Results list */}
        {activeResults.length > 0 && (
          <div className="space-y-3">
            {activeResults.map((r) => (
              <Link
                key={r.id}
                href={r.url}
                className="flex items-start gap-4 p-4 rounded-xl border transition hover:bg-white/5"
                style={{
                  borderColor: "var(--nrs-border)",
                  background: "var(--nrs-card)",
                }}
              >
                {r.image ? (
                  <Image
                    src={r.image} alt={r.title}
                    width={56} height={56}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-2xl"
                    style={{ background: "var(--nrs-bg-2)" }}>
                    {r.type === "product" ? "🛒" : r.type === "post" ? "💬" : "👤"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--nrs-accent-dim)", color: "var(--nrs-accent)" }}>
                      {r.type}
                    </span>
                    <span className="text-xs" style={{ color: "var(--nrs-accent)", flexShrink: 0 }}>{r.meta}</span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold" style={{ color: "var(--nrs-text)", fontFamily: "var(--font-heading)" }}>
                    <Highlight text={r.title} query={query} />
                  </h3>
                  {r.excerpt && (
                    <p className="mt-0.5 text-xs line-clamp-2" style={{ color: "var(--nrs-text-muted)" }}>
                      <Highlight text={r.excerpt} query={query} />
                    </p>
                  )}
                </div>
              </Link>
            ))}

            {/* Pagination */}
            {type !== "all" && activeResults.length === ITEMS_PER_PAGE && (
              <div className="flex justify-center gap-2 pt-4">
                {pageNum > 1 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}&type=${type}&page=${pageNum - 1}`}
                    className="nrs-btn px-4 py-2 text-sm"
                  >
                    ← Previous
                  </Link>
                )}
                <Link
                  href={`/search?q=${encodeURIComponent(query)}&type=${type}&page=${pageNum + 1}`}
                  className="nrs-btn px-4 py-2 text-sm"
                >
                  Next →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
      <BackToTop />
    </main>
  );
}
