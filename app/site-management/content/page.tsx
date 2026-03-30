import Link from "next/link";

const contentAreas = [
  {
    href: "/site-management/content/homepage",
    icon: "🏠",
    title: "Homepage",
    description: "Hero section, featured products, announcement banner, brand story, and custom sections.",
  },
  {
    href: "/site-management/content/global",
    icon: "🌐",
    title: "Global & Footer",
    description: "Site-wide announcement bar, footer text, social media links, and contact information.",
  },
  {
    href: "/site-management/content/shop",
    icon: "🛒",
    title: "Shop Page",
    description: "Shop page heading and description text shown above the product grid.",
  },
  {
    href: "/site-management/content/faq",
    icon: "❓",
    title: "FAQ Page",
    description: "Manage questions and answers for the FAQ page.",
  },
];

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Site Content</h1>
        <p className="text-neutral-400 text-sm mt-1">
          All changes are saved as drafts and must be published to go live.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {contentAreas.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20 p-5 transition flex gap-4"
          >
            <span className="text-2xl shrink-0">{area.icon}</span>
            <div>
              <p className="font-medium text-neutral-100">{area.title}</p>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{area.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
