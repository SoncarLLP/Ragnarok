// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://soncar.co.uk"),
  title: "Ragnarök – Functional Protein Blends | soncar.co.uk",
  description:
    "Premium collagen and plant-based protein blends by Ragnarök. UK-made supplements for hydration, recovery, and glow.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Ragnarök – Functional Protein Blends",
    description: "Premium collagen and plant-based protein blends crafted in the UK.",
    url: "https://soncar.co.uk",
    siteName: "Ragnarök",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Ragnarök Product Range" }],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ragnarök – Functional Protein Blends",
    description: "Premium collagen and plant-based protein blends crafted in the UK.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-neutral-950 text-neutral-100">
      <body>{children}</body>
    </html>
  );
}
