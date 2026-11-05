import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { publicApi } from "@/services/api";

type SiteNameSettings = { siteName?: string; logoText?: string } | null | undefined;

const FALLBACK_SITE = "Adrian Vale";

/** Read the DB-driven site name (logoText → siteName) from the shared
 *  react-query cache. Uses the same ["settings"] key as the app shell, so
 *  the request is deduped — no extra network call. */
export function useSiteName(): string {
  const qc = useQueryClient();
  const cached = qc.getQueryData<SiteNameSettings>(["settings"]);
  // Observer only keeps the hook reactive when settings arrive late;
  // refetchOnMount: false prevents this observer from triggering a refetch.
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: publicApi.settings,
    enabled: !cached,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const s = (cached ?? data) as SiteNameSettings;
  return (s?.logoText || s?.siteName || FALLBACK_SITE).replace(/®\s*$/, "").trim() || FALLBACK_SITE;
}

/** SPA-level SEO: keep document title & description in sync with the active
 *  view. Titles/descriptions may contain a `{site}` token which is replaced
 *  with the admin-editable site name (Website Settings → Site name). */
export function useSeo(title: string, description?: string) {
  const site = useSiteName();
  const finalTitle = title.replace(/\{site\}/g, site);
  const finalDesc = description?.replace(/\{site\}/g, site);

  useEffect(() => {
    document.title = finalTitle;
    if (finalDesc) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", finalDesc);
    }
    // Canonical URL follows the hash route
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, [finalTitle, finalDesc]);
}
