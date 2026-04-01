// lib/site-management.ts
// Types and helpers for the Site Management system

// ── Product theme types ──────────────────────────────────────────

export type ParticleEffectType =
  | "petals" | "embers" | "droplets" | "sparks"
  | "snowflakes" | "leaves" | "stars" | "dust"
  | "none";

export type ParticleDirectionType = "up" | "down" | "left" | "right" | "radial" | "random";
export type GlowPositionType     = "center" | "top" | "bottom" | "left" | "right";
export type MarbleDirectionType  = "horizontal" | "vertical" | "diagonal" | "radial";
export type KnotworkStyleType    = "simple_corners" | "full_border" | "elaborate" | "minimal";
export type HeadingWeightType    = "400" | "500" | "600" | "700" | "800";
export type BgBlendModeType      = "normal" | "multiply" | "screen" | "overlay" | "soft-light" | "hard-light" | "color-dodge" | "color-burn";
export type GradientDirectionType = "to bottom" | "to top" | "to right" | "to left" | "to bottom right" | "to bottom left" | "135deg" | "45deg";

/** Core theme (backward-compatible — stored in products.theme JSONB) */
export type ProductTheme = {
  // ── Core colours (original 14 fields — always present) ──
  bg:             string;
  bg2:            string;
  card:           string;
  panel:          string;
  accent:         string;
  accentGlow:     string;
  accentBorder:   string;
  heading:        string;
  marbleC1:       string;
  marbleC2:       string;
  marbleVein:     string;
  marbleSpeed:    string;
  particleEffect: ParticleEffectType;
  glowColor:      string;

  // ── Extended colour system (HSL pickers) ──
  primaryHue?:      number;   // 0-360
  primarySat?:      number;   // 0-100
  primaryLit?:      number;   // 0-100
  primaryAlpha?:    number;   // 0-100
  secondaryHue?:    number;
  secondarySat?:    number;
  secondaryLit?:    number;
  secondaryAlpha?:  number;
  accentHue?:       number;
  accentSat?:       number;
  accentLit?:       number;
  accentAlpha?:     number;

  // ── Colour adjustments ──
  contrast?:    number;   // 0-200 (100 = normal)
  luminosity?:  number;   // 0-200
  brilliance?:  number;   // 0-200
  warmth?:      number;   // -100 to +100
  presence?:    number;   // 0-100

  // ── Atmospheric glow ──
  glowEnabled?:   boolean;
  glowIntensity?: number;   // 0-100
  glowSpread?:    number;   // 0-100
  glowPosition?:  GlowPositionType;

  // ── Marble effect ──
  marbleEnabled?:       boolean;
  marbleVeinThickness?: number;   // 1-10
  marbleComplexity?:    number;   // 1-5
  marbleDirection?:     MarbleDirectionType;

  // ── Particle effects (extended) ──
  particleDensity?:   number;   // 0-100
  particleSize?:      number;   // 0-100
  particleSpeed?:     number;   // 0-100
  particleColor?:     string;
  particleDirection?: ParticleDirectionType;

  // ── Knotwork border ──
  knotworkEnabled?:       boolean;
  knotworkColor?:         string;
  knotworkThickness?:     number;   // 1-10
  knotworkStyle?:         KnotworkStyleType;
  knotworkGlow?:          boolean;
  knotworkGlowIntensity?: number;   // 0-100
  knotworkAnimated?:      boolean;

  // ── Card styling ──
  cardBgTintOpacity?:      number;   // 0-20
  cardBorderColor?:        string;
  cardBorderWidth?:        number;   // 0-4
  cardHoverGlowColor?:     string;
  cardHoverGlowIntensity?: number;   // 0-100
  cardShadowColor?:        string;
  cardShadowIntensity?:    number;   // 0-100

  // ── Typography ──
  bodyColor?:     string;
  priceColor?:    string;
  headingWeight?: HeadingWeightType;

  // ── Button styling ──
  btnBg?:           string;
  btnText?:         string;
  btnHoverBg?:      string;
  btnHoverText?:    string;
  btnBorderRadius?: number;   // 0-24 px
  btnGlow?:         boolean;
  btnGlowColor?:    string;

  // ── Background ──
  bgGradientDirection?: GradientDirectionType;
  bgImageUrl?:          string;
  bgImageOpacity?:      number;   // 0-100
  bgImageBlendMode?:    BgBlendModeType;

  // ── Future-proofing controls ──
  badgeColor?:      string;
  dividerColor?:    string;
  iconTint?:        string;
  scrollbarColor?:  string;
  selectionColor?:  string;
  focusRingColor?:  string;
  tooltipBg?:       string;
  tooltipText?:     string;
};

/** Default Claude Code themes — used as the reset target in Site Management. */
export const DEFAULT_PRODUCT_THEMES: Record<string, ProductTheme> = {
  "freyjas-bloom": {
    bg:             "#160814",
    bg2:            "#1e0e1e",
    card:           "#1a0c1a",
    panel:          "#261420",
    accent:         "#c9849c",
    accentGlow:     "rgba(201,132,156,0.45)",
    accentBorder:   "rgba(201,132,156,0.32)",
    heading:        "#e8b4c8",
    marbleC1:       "#3d0828",
    marbleC2:       "#5c2040",
    marbleVein:     "rgba(212,168,180,0.32)",
    marbleSpeed:    "18s",
    particleEffect: "petals",
    glowColor:      "rgba(180,80,120,0.4)",
  },
  "duemmens-nectar": {
    bg:             "#0f0800",
    bg2:            "#180d00",
    card:           "#140a00",
    panel:          "#201200",
    accent:         "#d4980a",
    accentGlow:     "rgba(212,152,10,0.45)",
    accentBorder:   "rgba(212,152,10,0.35)",
    heading:        "#f0b830",
    marbleC1:       "#1e0c00",
    marbleC2:       "#3d1e00",
    marbleVein:     "rgba(212,152,10,0.42)",
    marbleSpeed:    "16s",
    particleEffect: "droplets",
    glowColor:      "rgba(210,130,20,0.45)",
  },
  "loki-hell-fire": {
    bg:             "#080400",
    bg2:            "#110500",
    card:           "#0e0400",
    panel:          "#180800",
    accent:         "#e85010",
    accentGlow:     "rgba(232,80,16,0.55)",
    accentBorder:   "rgba(232,80,16,0.45)",
    heading:        "#ff7030",
    marbleC1:       "#180400",
    marbleC2:       "#3d0a00",
    marbleVein:     "rgba(232,80,16,0.5)",
    marbleSpeed:    "10s",
    particleEffect: "embers",
    glowColor:      "rgba(220,50,10,0.6)",
  },
};

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
  theme: ProductTheme | null;
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

// ── Design preset types ──────────────────────────────────────────

export type DesignPreset = {
  id: string;
  name: string;
  description: string | null;
  theme_data: ProductTheme;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DesignDraft = {
  id: string;
  product_id: string;
  theme_data: ProductTheme;
  has_unpublished_changes: boolean;
  last_modified_by: string | null;
  last_modified_at: string;
};

export type DesignHistoryEntry = {
  id: string;
  product_id: string;
  theme_data: ProductTheme;
  published_by: string | null;
  publisher_name: string | null;
  published_at: string;
};

// ── Design templates ──────────────────────────────────────────────

export type DesignTemplateKey =
  | "blank" | "warm" | "cool" | "fire"
  | "nature" | "royal" | "monochrome";

export const DESIGN_TEMPLATES: Record<DesignTemplateKey, { label: string; description: string; theme: Partial<ProductTheme> }> = {
  blank: {
    label: "Blank",
    description: "Inherits base Norse theme — a dark slate foundation.",
    theme: {
      bg: "#0a0a0f", bg2: "#111118", card: "#16161e", panel: "#2a2a35",
      accent: "#c9a84c", accentGlow: "rgba(201,168,76,0.35)", accentBorder: "rgba(201,168,76,0.2)",
      heading: "#ffffff", marbleC1: "#1a1a22", marbleC2: "#24242e",
      marbleVein: "rgba(201,168,76,0.18)", marbleSpeed: "20s",
      particleEffect: "none", glowColor: "rgba(201,168,76,0.2)",
      primaryHue: 45, primarySat: 55, primaryLit: 55, primaryAlpha: 100,
      glowEnabled: false, marbleEnabled: true, knotworkEnabled: false,
      contrast: 100, luminosity: 100, brilliance: 100, warmth: 0, presence: 40,
      btnBorderRadius: 8, headingWeight: "600",
    },
  },
  warm: {
    label: "Warm",
    description: "Amber and gold tones — rich, honeyed warmth.",
    theme: {
      bg: "#100800", bg2: "#1a0e00", card: "#150a00", panel: "#221400",
      accent: "#e8a020", accentGlow: "rgba(232,160,32,0.45)", accentBorder: "rgba(232,160,32,0.3)",
      heading: "#ffc840", marbleC1: "#200c00", marbleC2: "#402000",
      marbleVein: "rgba(232,160,32,0.38)", marbleSpeed: "15s",
      particleEffect: "sparks", glowColor: "rgba(220,140,20,0.4)",
      primaryHue: 38, primarySat: 90, primaryLit: 50, primaryAlpha: 100,
      glowEnabled: true, glowIntensity: 45, glowPosition: "bottom",
      marbleEnabled: true, marbleComplexity: 3, marbleDirection: "diagonal",
      contrast: 100, luminosity: 100, brilliance: 115, warmth: 60, presence: 65,
      btnBorderRadius: 6, btnGlow: true, headingWeight: "700",
    },
  },
  cool: {
    label: "Cool",
    description: "Ice blue and frost tones — crisp and elemental.",
    theme: {
      bg: "#030810", bg2: "#061018", card: "#040c16", panel: "#0a1a28",
      accent: "#4ab8e0", accentGlow: "rgba(74,184,224,0.4)", accentBorder: "rgba(74,184,224,0.25)",
      heading: "#a0d8f0", marbleC1: "#061020", marbleC2: "#0c2040",
      marbleVein: "rgba(74,184,224,0.3)", marbleSpeed: "22s",
      particleEffect: "snowflakes", glowColor: "rgba(40,160,220,0.35)",
      primaryHue: 200, primarySat: 70, primaryLit: 52, primaryAlpha: 100,
      glowEnabled: true, glowIntensity: 40, glowPosition: "top",
      marbleEnabled: true, marbleComplexity: 2, marbleDirection: "horizontal",
      contrast: 100, luminosity: 100, brilliance: 100, warmth: -40, presence: 55,
      btnBorderRadius: 10, btnGlow: true, headingWeight: "600",
    },
  },
  fire: {
    label: "Fire",
    description: "Red and orange flames — fierce, volcanic energy.",
    theme: {
      bg: "#080200", bg2: "#120400", card: "#0c0300", panel: "#1c0600",
      accent: "#ff4400", accentGlow: "rgba(255,68,0,0.6)", accentBorder: "rgba(255,68,0,0.4)",
      heading: "#ff7040", marbleC1: "#1a0400", marbleC2: "#400800",
      marbleVein: "rgba(255,68,0,0.5)", marbleSpeed: "9s",
      particleEffect: "embers", glowColor: "rgba(240,40,10,0.65)",
      primaryHue: 15, primarySat: 100, primaryLit: 50, primaryAlpha: 100,
      glowEnabled: true, glowIntensity: 70, glowPosition: "bottom",
      marbleEnabled: true, marbleComplexity: 4, marbleDirection: "vertical",
      contrast: 110, luminosity: 95, brilliance: 125, warmth: 85, presence: 80,
      btnBorderRadius: 4, btnGlow: true, headingWeight: "800",
    },
  },
  nature: {
    label: "Nature",
    description: "Green and earth tones — organic, grounded vitality.",
    theme: {
      bg: "#020a02", bg2: "#051005", card: "#040c04", panel: "#081808",
      accent: "#4aaa40", accentGlow: "rgba(74,170,64,0.4)", accentBorder: "rgba(74,170,64,0.25)",
      heading: "#80cc70", marbleC1: "#061006", marbleC2: "#0e240e",
      marbleVein: "rgba(74,170,64,0.3)", marbleSpeed: "18s",
      particleEffect: "leaves", glowColor: "rgba(40,150,30,0.35)",
      primaryHue: 120, primarySat: 50, primaryLit: 42, primaryAlpha: 100,
      glowEnabled: true, glowIntensity: 38, glowPosition: "center",
      marbleEnabled: true, marbleComplexity: 3, marbleDirection: "radial",
      contrast: 100, luminosity: 100, brilliance: 105, warmth: 10, presence: 55,
      btnBorderRadius: 12, btnGlow: false, headingWeight: "600",
    },
  },
  royal: {
    label: "Royal",
    description: "Purple and gold — majestic, legendary grandeur.",
    theme: {
      bg: "#060010", bg2: "#0c0020", card: "#080015", panel: "#120030",
      accent: "#9060e0", accentGlow: "rgba(144,96,224,0.5)", accentBorder: "rgba(144,96,224,0.3)",
      heading: "#c090ff", marbleC1: "#100020", marbleC2: "#200040",
      marbleVein: "rgba(144,96,224,0.35)", marbleSpeed: "20s",
      particleEffect: "stars", glowColor: "rgba(120,60,200,0.5)",
      primaryHue: 270, primarySat: 65, primaryLit: 55, primaryAlpha: 100,
      glowEnabled: true, glowIntensity: 55, glowPosition: "center",
      marbleEnabled: true, marbleComplexity: 4, marbleDirection: "radial",
      contrast: 100, luminosity: 100, brilliance: 115, warmth: -10, presence: 70,
      btnBorderRadius: 8, btnGlow: true, headingWeight: "700",
    },
  },
  monochrome: {
    label: "Monochrome",
    description: "Black, white and grey — timeless, editorial restraint.",
    theme: {
      bg: "#060606", bg2: "#0e0e0e", card: "#0a0a0a", panel: "#1a1a1a",
      accent: "#cccccc", accentGlow: "rgba(200,200,200,0.3)", accentBorder: "rgba(200,200,200,0.2)",
      heading: "#ffffff", marbleC1: "#141414", marbleC2: "#222222",
      marbleVein: "rgba(255,255,255,0.12)", marbleSpeed: "25s",
      particleEffect: "dust", glowColor: "rgba(180,180,180,0.2)",
      primaryHue: 0, primarySat: 0, primaryLit: 80, primaryAlpha: 100,
      glowEnabled: false, marbleEnabled: true, marbleComplexity: 2, marbleDirection: "horizontal",
      contrast: 120, luminosity: 100, brilliance: 80, warmth: 0, presence: 45,
      btnBorderRadius: 0, btnGlow: false, headingWeight: "600",
    },
  },
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
      heading: "Ragnarök",
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
