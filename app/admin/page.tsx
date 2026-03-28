import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { products } from "@/lib/products";
import ModerationSection from "./ModerationSection";

async function fetchCommunityData() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { posts: [], comments: [] };

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: posts }, { data: comments }] = await Promise.all([
    admin
      .from("posts")
      .select("id, type, content, image_url, categories, created_at, profiles(full_name, username)")
      .order("created_at", { ascending: false })
      .limit(30),
    admin
      .from("comments")
      .select("id, content, created_at, profiles(full_name, username), post_id")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return { posts: posts ?? [], comments: comments ?? [] };
}

export default async function AdminPage() {
  const { posts, comments } = await fetchCommunityData();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">SONCAR Admin</h1>
          <Link href="/" className="text-sm px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            View site
          </Link>
        </div>

        {/* Products */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Products</h2>
          <p className="text-neutral-400 text-sm mb-4">
            Product descriptions are managed in{" "}
            <code className="text-neutral-200">lib/products.ts</code>.
          </p>
          <div className="space-y-3">
            {products.map((p) => (
              <div
                key={p.slug}
                className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm text-neutral-400">{p.slug}</div>
                  <div className="font-medium">{p.name}</div>
                  <div className="mt-1 text-sm text-neutral-300">{p.blurb}</div>
                </div>
                <Link
                  href={`/product/${p.slug}`}
                  className="shrink-0 text-xs text-neutral-400 hover:text-white"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Community moderation */}
        <ModerationSection posts={posts} comments={comments} />
      </div>
    </main>
  );
}
