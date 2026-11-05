"use client";

import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/api";
import { useSeo } from "@/hooks/use-seo";
import { useRouter } from "@/lib/router";
import { Reveal, RevealLines } from "@/components/animations";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProjectCard } from "@/components/portfolio/project-card";
import { ArrowLeft, ArrowRight, Calendar, Building2, Layers, Eye, Wrench } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

type PaletteSwatch = { name: string; hex: string };

function safeJsonArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function safePalette(raw?: string | null): PaletteSwatch[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CaseStudyView({
  slug,
  prefetched,
}: {
  slug?: string;
  /** Pre-fetched project (admin draft preview) — skips this component's own fetch. */
  prefetched?: Project;
}) {
  const navigate = useRouter((s) => s.navigate);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project", slug ?? prefetched?.slug ?? "preview"],
    queryFn: () => publicApi.project(slug ?? ""),
    retry: false,
    enabled: !prefetched,
  });

  const project = prefetched ?? data?.project;

  useSeo(
    project ? `${project.title} — Case Study` : "Case Study — {site}®",
    project?.seoDescription ?? project?.summary
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading case study" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
        <p className="font-heading text-6xl font-bold text-outline">404</p>
        <p className="mt-4 text-lg text-muted-foreground">This project doesn&rsquo;t exist or isn&rsquo;t published yet.</p>
        <button
          onClick={() => navigate("/portfolio")}
          className="mt-8 inline-flex items-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to portfolio
        </button>
      </div>
    );
  }

  const tools = safeJsonArray(project.tools);
  const deliverables = safeJsonArray(project.applications);
  const palette = safePalette(project.colorPalette);
  const typography = safeJsonArray(project.typography);
  const gallery = project.images ?? [];

  const narrative: { label: string; text?: string | null }[] = [
    { label: "Objectives", text: project.objectives },
    { label: "Challenges", text: project.challenges },
    { label: "Research & Inspiration", text: project.research },
    { label: "Design Strategy", text: project.strategy },
    { label: "Concept Development", text: project.concept },
    { label: "Outcome", text: project.outcome },
  ].filter((n) => n.text);

  return (
    <>
      {/* Hero artwork */}
      <section className="relative">
        <div className="relative h-[62vh] min-h-[420px] w-full overflow-hidden bg-elevated">
          {project.coverUrl ? (
            <Image
              src={project.coverUrl}
              alt={`${project.title} cover artwork`}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(198,255,0,0.1),transparent_60%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/20" aria-hidden />
          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto max-w-[1600px] px-5 pb-12 sm:px-8 lg:px-12">
              <button
                onClick={() => navigate("/portfolio")}
                className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="size-4" aria-hidden /> All projects
              </button>
              <Reveal>
                <p className="text-xs uppercase tracking-[0.3em] text-primary">
                  {project.category?.name ?? "Design"}
                </p>
              </Reveal>
              <h1 className="mt-3 max-w-4xl font-heading text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02]">
                <RevealLines lines={[project.title]} />
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Meta strip */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-8 px-5 py-8 sm:px-8 md:grid-cols-4 lg:px-12">
          <MetaItem icon={Building2} label="Client" value={project.clientName || "Self-initiated"} />
          <MetaItem
            icon={Calendar}
            label="Year"
            value={String(project.year ?? (project.projectDate ? new Date(project.projectDate).getFullYear() : "—"))}
          />
          <MetaItem icon={Layers} label="Discipline" value={project.category?.name ?? "Design"} />
          <MetaItem icon={Eye} label="Views" value={String(project.viewCount)} />
        </div>
      </section>

      {/* Overview + description */}
      <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <Reveal>
            <p className="font-heading text-xs uppercase tracking-[0.3em] text-primary">Overview</p>
            <p className="mt-4 font-editorial text-2xl italic leading-relaxed text-foreground/85">
              {project.summary}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="space-y-5 text-base leading-relaxed text-muted-foreground">
              {project.description.split("\n").filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {tools.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wrench className="size-3.5" aria-hidden /> Tools:
                </span>
                {tools.map((t) => (
                  <span key={t} className="rounded-full border border-border px-3 py-1 text-xs text-foreground/80">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* Narrative chapters */}
      {narrative.map((chapter, i) => (
        <section
          key={chapter.label}
          className={cn("border-t border-border", i % 2 === 1 && "bg-surface")}
        >
          <div className="mx-auto grid max-w-[1600px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.6fr_1.4fr] lg:px-12">
            <Reveal>
              <p className="font-heading text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                ({String(i + 1).padStart(2, "0")}) {chapter.label}
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
                {(chapter.text ?? "").split("\n").filter(Boolean).map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      ))}

      {/* Color palette + typography */}
      {(palette.length > 0 || typography.length > 0) && (
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 lg:px-12">
            <SectionHeading index="CS" kicker="Design System" title="COLOUR & TYPE" />
            <div className="grid gap-10 lg:grid-cols-2">
              {palette.length > 0 && (
                <Reveal>
                  <div>
                    <p className="mb-5 text-xs uppercase tracking-[0.25em] text-muted-foreground">Colour Palette</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {palette.map((s) => (
                        <div key={s.hex} className="group">
                          <div
                            className="h-24 w-full border border-border"
                            style={{ backgroundColor: s.hex }}
                            role="img"
                            aria-label={`Colour swatch ${s.name}: ${s.hex}`}
                          />
                          <p className="mt-2 text-xs font-medium">{s.name}</p>
                          <p className="text-[11px] uppercase text-muted-foreground">{s.hex}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              )}
              {typography.length > 0 && (
                <Reveal delay={0.1}>
                  <div>
                    <p className="mb-5 text-xs uppercase tracking-[0.25em] text-muted-foreground">Typography</p>
                    <ul className="space-y-3">
                      {typography.map((t) => (
                        <li key={t} className="flex items-center gap-3 border-b border-border pb-3">
                          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                          <span className="font-heading text-lg">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12">
          <SectionHeading index="G" kicker="Visuals" title="PROJECT GALLERY" />
          <div className="space-y-8">
            {gallery.map((img, i) => (
              <Reveal key={img.id} delay={0.05}>
                <figure className={cn("relative overflow-hidden bg-elevated", i % 3 === 1 ? "aspect-[16/9]" : "aspect-[4/3]")}>
                  <Image
                    src={img.url}
                    alt={img.alt || `${project.title} gallery image ${i + 1}`}
                    fill
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 1200px"
                    className="object-cover transition-transform duration-700 hover:scale-[1.02]"
                  />
                  {img.caption && (
                    <figcaption className="absolute bottom-3 left-4 bg-black/60 px-3 py-1.5 text-xs text-white/90 backdrop-blur">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 lg:px-12">
            <p className="mb-6 font-heading text-xs uppercase tracking-[0.3em] text-primary">Design Applications</p>
            <div className="flex flex-wrap gap-3">
              {deliverables.map((d) => (
                <span key={d} className="border border-border bg-elevated px-4 py-2 text-sm text-foreground/85">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related + next */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12">
          {data?.next && (
            <Reveal>
              <button
                onClick={() => navigate(`/portfolio/${data.next!.slug}`)}
                className="group mb-16 flex w-full items-center justify-between gap-6 border border-border bg-elevated p-8 text-left transition-colors hover:border-primary/50"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Next project</p>
                  <p className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight transition-colors group-hover:text-primary">
                    {data.next.title}
                  </p>
                </div>
                <ArrowRight className="size-8 shrink-0 text-primary transition-transform group-hover:translate-x-2" aria-hidden />
              </button>
            </Reveal>
          )}

          {data?.related && data.related.length > 0 && (
            <>
              <SectionHeading index="R" kicker="More like this" title="RELATED PROJECTS" />
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.related.map((p) => (
                  <ProjectCard key={p.id} project={p} variant="standard" />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 text-primary" aria-hidden />
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
