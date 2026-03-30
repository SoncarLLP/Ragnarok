// lib/site-management.ts
// Types and helpers for the Site Management system

// ── Product types ────────────────────────────────────────────────

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";
export type ProductVisibility = "published" | "hidden" | "archived";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  coming_soon: "Coming Soon",
};

export const VISIBILITY_LABELS: Record<ProductVisibility, string> = {
  published: "Published",
  hidden: "Hidden",
  archived: "Archived",
};

export type CustomSegment = {
  id: string;
  title: string;
  content_html: string;
};

export const DEFAULT_SEGMENT_TEMPLATES = [
  "Ingredients",
  "Nutritional Information",
  "Recommended Usage",
  "Allergen Information",
  "Storage Instructions",
  "Benefits",
  "Size and Serving Information",
  "Frequently Asked Questions",
];

export type DBProduct = {
  id: string;
  slug: string;
  name: string;
  description_html: string;
  price_pence: number;
  stock_status: StockStatus;
  visibility: ProductVisibility;
  is_featured: boolean;
  primary_image_url: string | null;
  custom_segments: CustomSegment[];
  meta_title: string | null;
  meta_description: string | null;
  related_product_ids: string[];
  loyalty_multiplier: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string;
  position: number;
  is_primary: boolean;
  created_at: string;
};

export type DBProductWithImages = DBProduct & {
  product_images: ProductImage[];
};

// ── Site content types ───────────────────────────────────────────

export type HeroContent = {
  heading: string;
  subtitle: string;
  background_image_url: string | null;
  primary_cta_text: string;
  primary_cta_link: string;
  secondary_cta_text: string;
  secondary_cta_link: string;
};

export type AnnouncementBanner = {
  enabled: boolean;
  text: string;
  background_color: string;
  link: string;
  link_text: string;
};

export type BrandStory = {
  enabled: boolean;
  heading: string;
  body_html: string;
  image_url: string | null;
};

export type CustomHomepageSection = {
  id: string;
  type: "text" | "image" | "text_image";
  heading: string;
  body_html: string;
  image_url: string | null;
  image_position: "left" | "right";
};

export type HomepageContent = {
  hero: HeroContent;
  featured_product_slugs: string[];
  announcement_banner: AnnouncementBanner;
  brand_story: BrandStory;
  custom_sections: CustomHomepageSection[];
};

export type AnnouncementBar = {
  enabled: boolean;
  text: string;
  link: string;
  background_color: string;
};

export type FooterContent = {
  company_info: string;
  links: { label: string; url: string }[];
  social_media: {
    instagram: string;
    twitter: string;
    facebook: string;
    tiktok: string;
    youtube: string;
  };
};

export type GlobalContent = {
  announcement_bar: AnnouncementBar;
  footer: FooterContent;
  contact: {
    email: string;
    phone: string;
    address: string;
  };
};

export type ShopContent = {
  heading: string;
  description: string;
};

export type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

export type FAQContent = {
  items: FAQItem[];
};

// ── Draft types ──────────────────────────────────────────────────

export type ContentDraft = {
  id: string;
  entity_type: "product" | "site_content";
  entity_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draft_data: Record<string, any>;
  has_unpublished_changes: boolean;
  updated_at: string;
  updated_by: string | null;
};

export type PublishHistoryEntry = {
  id: string;
  entity_type: string;
  entity_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshot: Record<string, any>;
  published_at: string;
  published_by: string | null;
  publisher_name: string | null;
  notes: string | null;
};

// ── Price helpers ────────────────────────────────────────────────

export function penceToDisplay(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function displayToPence(display: string): number {
  const num = parseFloat(display.replace("£", ""));
  return Math.round(num * 100);
}

// ── Default content helpers ──────────────────────────────────────

export function defaultHomepageContent(): HomepageContent {
  return {
    hero: {
      heading: "RAGNAROK by SONCAR",
      subtitle: "Functional protein blends with mythic flair—crafted for hydration, recovery, and daily glow.",
      background_image_url: null,
      primary_cta_text: "Shop Bestsellers",
      primary_cta_link: "#shop",
      secondary_cta_text: "Policies",
      secondary_cta_link: "/policies",
    },
    featured_product_slugs: [],
    announcement_banner: {
      enabled: false,
      text: "",
      background_color: "#f59e0b",
      link: "",
      link_text: "",
    },
    brand_story: {
      enabled: false,
      heading: "",
      body_html: "",
      image_url: null,
    },
    custom_sections: [],
  };
}

export function defaultGlobalContent(): GlobalContent {
  return {
    announcement_bar: {
      enabled: false,
      text: "",
      link: "",
      background_color: "#1a1a1a",
    },
    footer: {
      company_info: "SONCAR Limited · soncar.co.uk · All rights reserved.",
      links: [],
      social_media: {
        instagram: "",
        twitter: "",
        facebook: "",
        tiktok: "",
        youtube: "",
      },
    },
    contact: {
      email: "",
      phone: "",
      address: "",
    },
  };
}
