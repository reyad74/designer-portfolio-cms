"use client";

import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/api";
import { SectionRenderer, DEFAULT_SECTIONS } from "@/components/sections/section-renderer";
import { useSeo } from "@/hooks/use-seo";

/**
 * 100% database-driven homepage: section text, order and visibility come from
 * GET /api/v1/homepage. When the API is unreachable or returns nothing, the
 * legacy DEFAULT_SECTIONS keep the site rendering (never blank).
 */
export function HomeView() {
  useSeo(
    "{site}® — Graphic Designer & Visual Storyteller",
    "Transforming ideas into meaningful visual identities through creativity, strategy and design."
  );

  const { data } = useQuery({
    queryKey: ["homepage"],
    queryFn: publicApi.homepage,
    staleTime: 15_000,
  });

  return <SectionRenderer sections={data && data.length ? data : DEFAULT_SECTIONS} />;
}
