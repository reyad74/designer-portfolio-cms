"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { publicApi } from "@/services/api";
import { useSeo } from "@/hooks/use-seo";
import { ProjectCard } from "@/components/portfolio/project-card";
import { Reveal } from "@/components/animations";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

export function PortfolioView() {
  useSeo(
    "Portfolio — {site}®",
    "Selected brand identity, packaging, editorial, UI/UX and poster design projects."
  );

  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset pagination when filters change — adjust-state-during-render pattern
  const [prevFilters, setPrevFilters] = useState({ category, debounced, sort });
  if (
    prevFilters.category !== category ||
    prevFilters.debounced !== debounced ||
    prevFilters.sort !== sort
  ) {
    setPrevFilters({ category, debounced, sort });
    setPage(1);
  }

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: publicApi.categories,
    staleTime: 60_000,
  });

  const { data, isFetching, isLoading } = useQuery({
    queryKey: ["projects", { category, q: debounced, sort, page }],
    queryFn: () => publicApi.projects({ category, q: debounced, sort, page, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const projects = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden border-b border-border pt-32 sm:pt-40 noise-overlay">
        <div className="mx-auto max-w-[1600px] px-5 pb-16 sm:px-8 lg:px-12">
          <Reveal>
            <p className="font-heading text-xs tracking-[0.3em] text-primary">PORTFOLIO</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-5 font-heading text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-none">
              THE <span className="font-editorial italic font-medium text-primary">WORK</span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              A decade of identities, packaging, editorial systems and campaigns — each built on
              strategy, executed with craft.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Filter bar */}
      <div className="sticky top-16 z-30 border-b border-border bg-background/90 backdrop-blur-md sm:top-20">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          {/* Categories */}
          <div className="hide-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1">
            <FilterChip active={category === "all"} onClick={() => setCategory("all")} label="All" />
            {categories?.map((c) => (
              <FilterChip
                key={c.id}
                active={category === c.slug}
                onClick={() => setCategory(c.slug)}
                label={c.name}
                count={c.projectCount}
              />
            ))}
          </div>
          {/* Search + sort */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 lg:w-56">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects…"
                aria-label="Search projects"
                className="h-10 border-border bg-elevated pl-9 text-sm"
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger aria-label="Sort projects" className="h-10 w-[150px] border-border bg-elevated text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="popular">Most viewed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 lg:px-12">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse bg-elevated" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-heading text-2xl text-muted-foreground">No projects found.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try a different category or search term.</p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 transition-opacity",
                isFetching && "opacity-60"
              )}
              aria-busy={isFetching}
            >
              {projects.map((p, i) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  variant={i % 5 === 0 ? "tall" : "standard"}
                  priority={i < 3}
                />
              ))}
            </div>

            {/* Load more / pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="mt-20 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-sm border border-border px-5 py-2.5 text-sm font-medium disabled:opacity-40 enabled:hover:border-primary"
                  aria-label="Previous page"
                >
                  Prev
                </button>
                <span className="px-4 font-heading text-sm text-muted-foreground">
                  Page {page} / {meta.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="rounded-sm border border-border px-5 py-2.5 text-sm font-medium disabled:opacity-40 enabled:hover:border-primary"
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            )}
            {isFetching && page > 1 && (
              <div className="mt-6 flex justify-center">
                <Loader2 className="size-5 animate-spin text-primary" aria-label="Loading" />
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium tracking-wide transition-all duration-300",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      )}
    >
      {label}
      {typeof count === "number" && (
        <span className="ml-1.5 opacity-60">({count})</span>
      )}
    </button>
  );
}
