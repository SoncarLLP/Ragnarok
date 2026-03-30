import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SiteManagementDashboard() {
  const admin = createAdminClient();

  const [
    { count: totalProducts },
    { count: publishedProducts },
    { count: draftCount },
    { data: recentHistory },
  ] = await Promise.all([
    admin.from("products").select("id", { count: "exact", head: true }),
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("visibility", "published"),
    admin
      .from("content_drafts")
      .select("id", { count: "exact", head: true })
      .eq("has_unpublished_changes", true),
    admin
      .from("publish_history")
      .select("entity_type, entity_id, published_at, publisher_name, notes")
      .order("published_at", { ascending: false })
      .limit(5),
  ]);

  const hasUnpublished = (draftCount ?? 0) > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Site Management</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Manage products, content, and publish changes to the live site.
        </p>
      </div>

      {/* Unpublished changes banner */}
      {hasUnpublished && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-amber-300 text-xl">⚠</span>
            <div>
              <p className="text-amber-200 font-medium text-sm">
                {draftCount} unpublished {draftCount === 1 ? "draft" : "drafts"}
              </p>
              <p className="text-amber-300/70 text-xs mt-0.5">
                Changes are saved but not yet live on the site.
              </p>
            </div>
          </div>
          <Link
            href="/site-management/products"
            className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 transition"
          >
            Review drafts →
          </Link>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total Products" value={totalProducts ?? 0} href="/site-management/products" />
        <StatCard label="Published" value={publishedProducts ?? 0} href="/site-management/products" />
        <StatCard label="Unpublished Drafts" value={draftCount ?? 0} href="/site-management/products" highlight={hasUnpublished} />
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <QuickLink
          href="/site-management/products"
          icon="📦"
          title="Products"
          description="Add, edit, and publish products. Manage images, descriptions, pricing, and custom content segments."
        />
        <QuickLink
          href="/site-management/content/homepage"
          icon="🏠"
          title="Homepage"
          description="Edit hero section, featured products, announcement banner, and brand story."
        />
        <QuickLink
          href="/site-management/content/global"
          icon="🌐"
          title="Global & Footer"
          description="Manage site-wide announcement bar, footer content, social links, and contact info."
        />
        <QuickLink
          href="/site-management/content/faq"
          icon="❓"
          title="FAQ"
          description="Edit the FAQ page — add, reorder, or remove questions and answers."
        />
      </div>

      {/* Recent publish history */}
      {recentHistory && recentHistory.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-300 mb-3">Recent Publishes</h2>
          <div className="rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden">
            {recentHistory.map((entry) => (
              <div key={`${entry.entity_type}-${entry.entity_id}-${entry.published_at}`} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <span className="text-neutral-400 text-xs mr-2 uppercase">
                    {entry.entity_type === "product" ? "📦 Product" : "📄 Content"}
                  </span>
                  <span className="font-medium text-neutral-200">{entry.entity_id}</span>
                  {entry.notes && (
                    <span className="text-neutral-500 text-xs ml-2">— {entry.notes}</span>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-neutral-500">
                  <div>{entry.publisher_name ?? "Super Admin"}</div>
                  <div>{new Date(entry.published_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border px-5 py-4 hover:bg-white/5 transition ${
        highlight
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className={`text-2xl font-semibold ${highlight ? "text-amber-300" : "text-white"}`}>
        {value}
      </div>
      <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
    </Link>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20 p-5 transition flex gap-4"
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div>
        <p className="font-medium text-neutral-100">{title}</p>
        <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}
