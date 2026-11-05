import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adrianvale.studio";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/about",
    "/portfolio",
    "/services",
    "/skills",
    "/experience",
    "/testimonials",
    "/contact",
  ].map((route) => ({
    url: `${SITE_URL}/#${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.7,
  }));
  return staticRoutes;
}
