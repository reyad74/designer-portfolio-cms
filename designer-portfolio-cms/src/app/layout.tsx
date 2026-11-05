import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import "./theme-hooks.css";
import { Toaster } from "@/components/ui/sonner";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adrianvale.studio";

interface PublicSettingsShape {
  siteName?: string;
  logoText?: string;
  tagline?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImageUrl?: string;
  faviconUrl?: string;
}

const DEFAULT_TITLE = "Adrian Vale® — Graphic Designer & Visual Storyteller";
const DEFAULT_DESCRIPTION =
  "Independent graphic designer crafting brand identities, editorial systems and visual experiences that convert attention into memory.";
const DEFAULT_KEYWORDS = [
  "graphic designer",
  "brand identity",
  "visual design",
  "art direction",
  "portfolio",
  "editorial design",
  "packaging design",
];

/**
 * Site metadata is admin-editable: fetched live from the Django CMS (with a
 * graceful fallback when the backend is briefly unavailable).
 */
// Always render dynamically so admin edits (site name, meta title, SEO
// fields) go live on the next request — never frozen into a static shell.
export const dynamic = "force-dynamic";

async function fetchSettings(): Promise<PublicSettingsShape | null> {
  try {
    const base = process.env.DJANGO_INTERNAL_URL ?? "http://host.docker.internal:8000";
    const res = await fetch(`${base}/api/v1/settings`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    const json = (await res.json()) as { success: boolean; data?: PublicSettingsShape } | null;
    return json?.success ? json.data ?? null : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const s = await fetchSettings();
  const title = s?.metaTitle?.trim() || DEFAULT_TITLE;
  const description = s?.metaDescription?.trim() || DEFAULT_DESCRIPTION;
  const siteName = s?.siteName ? `${s.siteName}® Portfolio` : "Adrian Vale® Portfolio";
  const keywords = s?.metaKeywords
    ? s.metaKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    : DEFAULT_KEYWORDS;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s — ${s?.siteName || "Adrian Vale"}®` },
    description,
    keywords,
    authors: [{ name: s?.siteName || "Adrian Vale" }],
    creator: s?.siteName || "Adrian Vale",
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName,
      locale: "en_US",
      type: "website",
      images: s?.ogImageUrl ? [{ url: s.ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: s?.ogImageUrl ? [s.ogImageUrl] : undefined,
    },
    icons: s?.faviconUrl ? { icon: s.faviconUrl } : undefined,
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
