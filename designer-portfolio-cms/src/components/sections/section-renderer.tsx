"use client";

import { useQuery } from "@tanstack/react-query";
import type { CSSProperties, ReactNode } from "react";
import { HomeHero } from "@/components/sections/home-hero";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProjectCard } from "@/components/portfolio/project-card";
import { Counter, Magnetic, Reveal, RevealLines } from "@/components/animations";
import { useRouter } from "@/lib/router";
import { publicApi } from "@/services/api";
import type { HomepageSection, SectionType } from "@/lib/cms-types";
import type { Project, WebsiteSettings } from "@/lib/types";
import { ArrowRight, ArrowUpRight, Quote, Star } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import "@/app/sections.css";

/**
 * WebsiteSettings plus the CMS motion/hero flags returned by /api/v1/settings.
 * All fields optional — absence means "enabled / default intensity".
 */
export type SettingsWithFlags = WebsiteSettings & {
  hero3dEnabled?: boolean;
  particlesEnabled?: boolean;
  animationIntensity?: number;
  parallaxEnabled?: boolean;
  smoothScrollEnabled?: boolean;
  cursorEffectEnabled?: boolean;
  heroFallbackUrl?: string;
};

/* ── Config helpers (fallback-safe readers) ─────────────────────────────── */

const MARQUEE_WORDS = [
  "Brand Identity",
  "Art Direction",
  "Editorial",
  "Packaging",
  "Typography",
  "Motion",
  "3D Visuals",
  "Creative Strategy",
];

interface StatSpec {
  value: string;
  label: string;
}

function configOf(section: HomepageSection): Record<string, unknown> {
  return (section.config ?? {}) as Record<string, unknown>;
}

function str(raw: unknown, fallback: string): string {
  return typeof raw === "string" && raw.trim() ? raw : fallback;
}

function toInt(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function readCta(raw: unknown, fallbackLabel: string, fallbackPath: string): { label: string; path: string } {
  const obj = (raw ?? null) as { label?: unknown; path?: unknown } | null;
  return {
    label: str(obj?.label, fallbackLabel),
    path: str(obj?.path, fallbackPath),
  };
}

function readStats(raw: unknown, fallback: StatSpec[]): StatSpec[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const stats = raw
    .map((s) => {
      const item = (s ?? {}) as { value?: unknown; label?: unknown };
      return { value: String(item.value ?? "").trim(), label: String(item.label ?? "").trim() };
    })
    .filter((s) => s.value);
  return stats.length ? stats : fallback;
}

/** "9+" → { to: 9, suffix: "+" } (or null when not a countable stat). */
function statParts(value: string): { to: number; suffix: string } | null {
  const m = /^(\d+)\s*(.*)$/.exec(value.trim());
  return m ? { to: Number(m[1]), suffix: m[2] } : null;
}

/* ── Hero ───────────────────────────────────────────────────────────────── */

function HeroSection({ section, preview }: { section: HomepageSection; preview?: boolean }) {
  // Hero is a self-contained full-bleed section (its own noise/grid texture,
  // overlays and 100svh height) — the shell only supplies background extras.
  const backgroundUrl = section.backgroundUrl;
  return (
    <div className="relative" data-section-type="hero">
      {backgroundUrl ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${backgroundUrl}")` }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-background/70" aria-hidden />
        </>
      ) : null}
      {section.backgroundStyle === "gradient" && (
        <div className="section-bg-gradient pointer-events-none absolute inset-0" aria-hidden />
      )}
      {preview && <PreviewChip section={section} />}
      <HomeHero section={section} />
    </div>
  );
}

/* ── Marquee ────────────────────────────────────────────────────────────── */

function MarqueeSection({ section, preview }: { section: HomepageSection; preview?: boolean }) {
  const raw = configOf(section).words;
  const words =
    Array.isArray(raw) && raw.length ? raw.map((w) => String(w)).filter(Boolean) : MARQUEE_WORDS;
  const row = [...words, ...words];

  return (
    <div className="relative" data-section-type="marquee">
      {section.backgroundUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${section.backgroundUrl}")` }}
          aria-hidden
        />
      ) : null}
      {preview && <PreviewChip section={section} />}
      <div className="relative z-[2] overflow-hidden border-y border-border bg-surface py-5" aria-hidden>
        <motion.div
          className="flex w-max items-center gap-10 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        >
          {row.map((w, i) => (
            <span key={i} className="flex items-center gap-10">
              <span className="font-heading text-sm uppercase tracking-[0.3em] text-muted-foreground">
                {w}
              </span>
              <span className="size-1 rounded-full bg-primary" />
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ── Featured projects ──────────────────────────────────────────────────── */

function FeaturedProjectsSection({ section, index }: { section: HomepageSection; index?: string }) {
  const navigate = useRouter((s) => s.navigate);
  const config = configOf(section);
  const limit = toInt(config.limit, 4);
  const preset: Project[] | undefined = Array.isArray(section.projects)
    ? section.projects
    : undefined;

  // Sections may arrive with server-resolved projects (manual mode / preview).
  // Otherwise fall back to the public featured endpoint.
  const { data, isLoading } = useQuery({
    queryKey: ["featured"],
    queryFn: publicApi.featured,
    staleTime: 60_000,
    enabled: !preset,
  });

  const projects = (preset ?? data ?? []).slice(0, limit);

  return (
    <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12" id="work">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          index={index}
          kicker={str(section.subtitle, "Selected Work")}
          title={str(section.title, "FEATURED PROJECTS")}
          className="mb-0"
        />
        <Reveal delay={0.1}>
          <button
            onClick={() => navigate("/portfolio")}
            className="group inline-flex items-center gap-2 border-b border-border pb-1 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            All projects
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </button>
        </Reveal>
      </div>

      {section.description ? (
        <Reveal delay={0.05}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {section.description}
          </p>
        </Reveal>
      ) : null}

      {isLoading && !preset ? (
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse bg-elevated" />
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2">
          {projects.map((p, i) => (
            <div key={p.id} className={i % 2 === 1 ? "sm:mt-16" : ""}>
              <ProjectCard project={p} variant="tall" priority={i === 0} />
            </div>
          ))}
        </div>
      ) : (
        <div className="theme-card mt-14 p-10 text-center">
          <p className="text-sm text-muted-foreground">No featured projects yet — check back soon.</p>
        </div>
      )}
    </div>
  );
}

/* ── About preview ──────────────────────────────────────────────────────── */

const DEFAULT_ABOUT_LINES: ReactNode[] = [
  <>Every brand has a truth worth amplifying. My work exists to find it —</>,
  <>
    then give it form through <span className="text-foreground">strategy-led identities</span>, disciplined
    typography and uncluttered composition.
  </>,
];

function AboutPreviewSection({ section, index }: { section: HomepageSection; index?: string }) {
  const navigate = useRouter((s) => s.navigate);
  const config = configOf(section);
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: publicApi.profile,
    staleTime: 60_000,
  });
  const p = data?.profile;

  const showStats = config.showStats !== false;
  const ctaLabel = str(config.ctaLabel, "More about me");
  const ctaPath = str(config.ctaPath, "/about");
  const paragraphs = (section.description ?? "")
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
  const copyLines = paragraphs.length ? paragraphs.map((para) => <>{para}</>) : DEFAULT_ABOUT_LINES;

  return (
    <div className="mx-auto grid max-w-[1600px] gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-12">
      {/* Portrait */}
      <Reveal className="relative">
        <div className="relative aspect-[4/5] max-h-[640px] w-full overflow-hidden bg-elevated">
          {p?.photoUrl ? (
            <Image
              src={p.photoUrl}
              alt={`Portrait of ${p.name}`}
              fill
              sizes="(max-width: 1024px) 100vw, 600px"
              className="object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(198,255,0,0.08),transparent_60%)]" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" aria-hidden />
        </div>
        <div className="absolute -bottom-6 -right-4 hidden sm:block">
          <div className="glass px-6 py-5">
            <p className="font-heading text-4xl font-bold text-primary">
              <Counter to={p?.yearsExperience ?? 9} suffix="+" />
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Years of craft
            </p>
          </div>
        </div>
      </Reveal>

      {/* Copy */}
      <div className="flex flex-col justify-center">
        <SectionHeading
          index={index}
          kicker={str(section.subtitle, "About")}
          title={str(section.title, "DESIGN WITH INTENT")}
          className="mb-8"
        />
        <RevealLines
          className="space-y-5 text-base sm:text-lg leading-relaxed text-muted-foreground"
          lines={copyLines}
        />
        <Reveal delay={0.15}>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            {p?.philosophyTitle ? `${p.philosophyTitle} — ` : ""}
            {p?.shortBio ||
              "Independent designer partnering with founders, studios and marketing teams worldwide."}
          </p>
        </Reveal>

        {showStats && (
          <Reveal delay={0.2} className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            {[
              { label: "Clients", value: p?.clientCount ?? 60, suffix: "+" },
              { label: "Projects", value: p?.projectCount ?? 120, suffix: "+" },
              { label: "Awards", value: p?.awardsCount ?? 12, suffix: "" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-heading text-3xl sm:text-4xl font-bold">
                  <Counter to={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {s.label}
                </p>
              </div>
            ))}
          </Reveal>
        )}

        <Reveal delay={0.25} className="mt-12">
          <button
            onClick={() => navigate(ctaPath)}
            className="group inline-flex items-center gap-2 rounded-sm border border-border px-6 py-3.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
          >
            {ctaLabel}
            <ArrowUpRight
              className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </button>
        </Reveal>
      </div>
    </div>
  );
}

/* ── Services preview ───────────────────────────────────────────────────── */

function ServicesPreviewSection({ section, index }: { section: HomepageSection; index?: string }) {
  const navigate = useRouter((s) => s.navigate);
  const limit = toInt(configOf(section).limit, 4);
  const { data } = useQuery({
    queryKey: ["services"],
    queryFn: publicApi.services,
    staleTime: 60_000,
  });
  const services = data?.filter((s) => s.featured).slice(0, limit) ?? data?.slice(0, limit) ?? [];

  return (
    <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
      <SectionHeading
        index={index}
        kicker={str(section.subtitle, "What I Do")}
        title={str(section.title, "SERVICES")}
      />
      {section.description ? (
        <Reveal>
          <p className="-mt-4 mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground sm:-mt-6">
            {section.description}
          </p>
        </Reveal>
      ) : null}
      <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
        {services.map((s, i) => (
          <Reveal key={s.id} delay={i * 0.06}>
            <button
              onClick={() => navigate("/services")}
              className="group flex h-full w-full flex-col justify-between gap-10 bg-background p-8 text-left transition-colors duration-300 hover:bg-elevated"
            >
              <div>
                <span className="font-heading text-xs text-primary">({String(i + 1).padStart(2, "0")})</span>
                <h3 className="mt-4 font-heading text-2xl font-semibold tracking-tight transition-colors group-hover:text-primary">
                  {s.title}
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {s.shortDescription}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-primary">
                Explore
                <ArrowUpRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </span>
            </button>
          </Reveal>
        ))}
        {/* Fill the trailing grid cell with a CTA so the layout never shows a blank tile */}
        <Reveal delay={0.3}>
          <button
            onClick={() => navigate("/services")}
            className="theme-card group flex h-full w-full flex-col items-start justify-center gap-5 p-8 text-left transition-colors duration-300 hover:bg-elevated"
          >
            <span className="font-heading text-xs uppercase tracking-[0.25em] text-muted-foreground">
              + 6 more disciplines
            </span>
            <span className="inline-flex items-center gap-2 font-heading text-2xl font-semibold text-primary">
              View all services
              <ArrowUpRight
                className="size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                aria-hidden
              />
            </span>
          </button>
        </Reveal>
      </div>
    </div>
  );
}

/* ── Skills preview ─────────────────────────────────────────────────────── */

function SkillsPreviewSection({ section, index }: { section: HomepageSection; index?: string }) {
  const navigate = useRouter((s) => s.navigate);
  const limit = toInt(configOf(section).limit, 6);
  const { data } = useQuery({
    queryKey: ["skills"],
    queryFn: publicApi.skills,
    staleTime: 60_000,
  });
  const software = data?.filter((s) => s.category === "SOFTWARE").slice(0, limit) ?? [];

  return (
    <div className="mx-auto grid max-w-[1600px] gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:px-12">
      <div>
        <SectionHeading
          index={index}
          kicker={str(section.subtitle, "Toolkit")}
          title={str(section.title, "SKILLS & TOOLS")}
          className="mb-8"
        />
        <Reveal delay={0.1}>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            {section.description ||
              "A decade across studios and independent practice — fluent in the industry’s core tools, and in the principles that outlast them."}
          </p>
        </Reveal>
        <Reveal delay={0.15} className="mt-8">
          <button
            onClick={() => navigate("/skills")}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Full expertise →
          </button>
        </Reveal>
      </div>
      <div className="space-y-7">
        {software.map((s, i) => (
          <Reveal key={s.id} delay={i * 0.05}>
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <span className="font-medium">{s.name}</span>
                <span className="font-heading text-sm text-muted-foreground">{s.level}%</span>
              </div>
              <div className="h-[3px] w-full bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${s.level}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ── Testimonials preview ───────────────────────────────────────────────── */

function TestimonialsPreviewSection({ section, index }: { section: HomepageSection; index?: string }) {
  const navigate = useRouter((s) => s.navigate);
  const limit = toInt(configOf(section).limit, 3);
  const { data } = useQuery({
    queryKey: ["testimonials"],
    queryFn: publicApi.testimonials,
    staleTime: 60_000,
  });
  const items = data?.slice(0, limit) ?? [];

  return (
    <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          index={index}
          kicker={str(section.subtitle, "Client Words")}
          title={str(section.title, "TESTIMONIALS")}
          className="mb-0"
        />
        <Reveal delay={0.1}>
          <button
            onClick={() => navigate("/testimonials")}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Read all →
          </button>
        </Reveal>
      </div>
      {section.description ? (
        <Reveal>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {section.description}
          </p>
        </Reveal>
      ) : null}
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {items.map((t, i) => (
          <Reveal key={t.id} delay={i * 0.08}>
            <figure className="flex h-full flex-col justify-between gap-8 border border-border bg-elevated p-7 transition-colors hover:border-primary/40">
              <div>
                <Quote className="size-6 text-primary" aria-hidden />
                <blockquote className="mt-4 text-sm leading-relaxed text-foreground/90">
                  &ldquo;{t.review}&rdquo;
                </blockquote>
              </div>
              <figcaption>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{t.clientName}</p>
                    <p className="text-xs text-muted-foreground">{t.company}</p>
                  </div>
                  {t.rating ? (
                    <div className="flex gap-0.5" aria-label={`Rated ${t.rating} out of 5`}>
                      {[...Array(t.rating)].map((_, j) => (
                        <Star key={j} className="size-3 fill-primary text-primary" aria-hidden />
                      ))}
                    </div>
                  ) : null}
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
        {items.length === 0 && (
          <div className="theme-card p-10 text-center md:col-span-3">
            <p className="text-sm text-muted-foreground">Client stories are on their way.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Experience preview ─────────────────────────────────────────────────── */

function resumeYear(d?: string | null): string {
  if (!d) return "Present";
  const year = new Date(d).getFullYear();
  return Number.isFinite(year) ? String(year) : "Present";
}

function ExperiencePreviewSection({ section, index }: { section: HomepageSection; index?: string }) {
  const navigate = useRouter((s) => s.navigate);
  const limit = toInt(configOf(section).limit, 3);
  const { data } = useQuery({
    queryKey: ["resume"],
    queryFn: publicApi.resume,
    staleTime: 60_000,
  });
  const items = (data?.experiences ?? []).slice(0, limit);

  return (
    <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          index={index}
          kicker={str(section.subtitle, "Experience")}
          title={str(section.title, "EXPERIENCE")}
          className="mb-0"
        />
        <Reveal delay={0.1}>
          <button
            onClick={() => navigate("/experience")}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Full journey →
          </button>
        </Reveal>
      </div>
      {section.description ? (
        <Reveal>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {section.description}
          </p>
        </Reveal>
      ) : null}
      <div className="mt-14 border-t border-border">
        {items.map((e, i) => (
          <Reveal key={e.id} delay={i * 0.06}>
            <div className="group grid gap-2 border-b border-border py-8 sm:grid-cols-[auto_1fr_auto] sm:items-baseline sm:gap-10">
              <span className="font-heading text-sm text-muted-foreground">
                {resumeYear(e.startDate)} — {e.current ? "Present" : resumeYear(e.endDate)}
              </span>
              <div>
                <h3 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight">
                  {e.role}
                  <span className="text-primary"> · </span>
                  <span className="text-muted-foreground">{e.company}</span>
                </h3>
                {e.location && (
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {e.location}
                  </p>
                )}
                {e.description && (
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {e.description}
                  </p>
                )}
              </div>
              {e.current && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
                  Current
                </span>
              )}
            </div>
          </Reveal>
        ))}
        {items.length === 0 && (
          <div className="theme-card mt-8 p-10 text-center">
            <p className="text-sm text-muted-foreground">Career highlights coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Contact CTA ────────────────────────────────────────────────────────── */

function accentLastWord(line: string): ReactNode {
  const words = line.trim().split(/\s+/);
  if (words.length <= 1) {
    return <span className="font-editorial italic font-medium text-primary">{line}</span>;
  }
  const last = words.pop() as string;
  return (
    <>
      {words.join(" ")}{" "}
      <span className="font-editorial italic font-medium text-primary">{last}</span>
    </>
  );
}

function ContactCtaSection({ section }: { section: HomepageSection }) {
  const navigate = useRouter((s) => s.navigate);
  const config = configOf(section);
  const headline = str(config.headline, "HAVE A PROJECT IN MIND?");
  const sub = str(config.sub, "LET'S MAKE SOMETHING REMARKABLE.");
  const ctaLabel = str(config.ctaLabel, "Start a Project");
  const ctaPath = str(config.ctaPath, "/contact");
  const kicker = str(section.subtitle, "Next step");

  return (
    <div className="relative mx-auto max-w-[1600px] px-5 text-center sm:px-8 lg:px-12">
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          {kicker}
        </p>
      </Reveal>
      <h2 className="mx-auto mt-6 max-w-5xl font-heading font-bold tracking-tight leading-[1.02] text-[clamp(2.25rem,6vw,5rem)]">
        <RevealLines
          lines={[
            <>{headline}</>,
            <>{accentLastWord(sub)}</>,
          ]}
        />
      </h2>
      <Reveal delay={0.2} className="mt-12">
        <Magnetic>
          <button
            onClick={() => navigate(ctaPath)}
            className="inline-flex items-center gap-3 rounded-full bg-primary px-10 py-5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.04] active:scale-95"
          >
            {ctaLabel}
            <ArrowUpRight className="size-4" aria-hidden />
          </button>
        </Magnetic>
      </Reveal>
    </div>
  );
}

/* ── Shell: background style, padding rhythm, preview chips ─────────────── */

/** Full-bleed surface treatment per section type (moved out of the inner
    components so the shell padding is covered by the band, flush design). */
const BAND_CLASSES: Partial<Record<SectionType, string>> = {
  about_preview: "border-y border-border bg-surface",
  skills_preview: "border-y border-border bg-surface",
  contact_cta: "overflow-hidden border-t border-border",
};

function PreviewChip({ section }: { section: HomepageSection }) {
  return (
    <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2">
      <span className="rounded-sm bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
        {section.sectionType}
      </span>
      {section.status !== "PUBLISHED" && (
        <span className="rounded-sm border border-yellow-400/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-400">
          Draft
        </span>
      )}
      {!section.isVisible && (
        <span className="rounded-sm border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Hidden
        </span>
      )}
    </div>
  );
}

function renderSection(section: HomepageSection, index: string | undefined, preview?: boolean) {
  switch (section.sectionType) {
    case "hero":
      return <HeroSection section={section} preview={preview} />;
    case "marquee":
      return <MarqueeSection section={section} preview={preview} />;
    case "featured_projects":
      return <FeaturedProjectsSection section={section} index={index} />;
    case "about_preview":
      return <AboutPreviewSection section={section} index={index} />;
    case "services_preview":
      return <ServicesPreviewSection section={section} index={index} />;
    case "skills_preview":
      return <SkillsPreviewSection section={section} index={index} />;
    case "testimonials_preview":
      return <TestimonialsPreviewSection section={section} index={index} />;
    case "experience_preview":
      return <ExperiencePreviewSection section={section} index={index} />;
    case "contact_cta":
      return <ContactCtaSection section={section} />;
    default:
      return null;
  }
}

function SectionShell({
  section,
  index,
  preview,
}: {
  section: HomepageSection;
  index?: string;
  preview?: boolean;
}) {
  const { sectionType, backgroundStyle, backgroundUrl } = section;
  if (sectionType === "hero" || sectionType === "marquee") {
    // Full-bleed structural sections manage their own height/bands.
    return <>{renderSection(section, index, preview)}</>;
  }

  const style: CSSProperties = {
    paddingTop: "var(--section-y, 7rem)",
    paddingBottom: "var(--section-y, 7rem)",
  };

  return (
    <section
      className={cn("relative", BAND_CLASSES[sectionType], backgroundStyle === "noise" && "noise-overlay", backgroundStyle === "grid" && "editorial-grid-bg", backgroundStyle === "gradient" && "section-bg-gradient")}
      style={style}
      data-section-type={sectionType}
    >
      {backgroundUrl ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${backgroundUrl}")` }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-background/85" aria-hidden />
        </>
      ) : null}
      {sectionType === "contact_cta" && (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_110%,rgba(198,255,0,0.13),transparent_70%)]"
          aria-hidden
        />
      )}
      {preview && <PreviewChip section={section} />}
      <div className="relative z-[2]">{renderSection(section, index, preview)}</div>
    </section>
  );
}

/* ── Renderer ───────────────────────────────────────────────────────────── */

/** Section types that participate in the (01) (02) … editorial numbering. */
const INDEXED_TYPES: ReadonlySet<SectionType> = new Set([
  "featured_projects",
  "about_preview",
  "services_preview",
  "skills_preview",
  "testimonials_preview",
  "experience_preview",
]);

export function SectionRenderer({
  sections,
  preview = false,
}: {
  sections: HomepageSection[];
  preview?: boolean;
}) {
  let contentIndex = 0;
  return (
    <>
      {sections.map((section) => {
        const index = INDEXED_TYPES.has(section.sectionType)
          ? String(++contentIndex).padStart(2, "0")
          : undefined;
        return <SectionShell key={section.id} section={section} index={index} preview={preview} />;
      })}
    </>
  );
}

/* ── Legacy defaults (fallback when the API is unreachable/empty) ───────── */

export const DEFAULT_SECTIONS: HomepageSection[] = [
  {
    id: "default-hero",
    sectionType: "hero",
    title: "Adrian Vale",
    subtitle: "Independent graphic designer & art director",
    description: "",
    config: {
      headlineLines: ["I DON'T JUST DESIGN.", "I CREATE VISUAL", "EXPERIENCES."],
      ctaPrimary: { label: "View My Work", path: "/portfolio" },
      ctaSecondary: { label: "Let's Collaborate", path: "/contact" },
      showStats: true,
      stats: [
        { value: "9+", label: "Years" },
        { value: "60+", label: "Clients" },
        { value: "120+", label: "Projects" },
      ],
    },
    backgroundUrl: "",
    backgroundStyle: "gradient",
    order: 1,
    isVisible: true,
    status: "PUBLISHED",
  },
  {
    id: "default-marquee",
    sectionType: "marquee",
    title: "",
    subtitle: "",
    description: "",
    config: { words: MARQUEE_WORDS },
    backgroundUrl: "",
    backgroundStyle: "none",
    order: 2,
    isVisible: true,
    status: "PUBLISHED",
  },
  {
    id: "default-featured",
    sectionType: "featured_projects",
    title: "FEATURED PROJECTS",
    subtitle: "Selected Work",
    description: "",
    config: { limit: 4, mode: "auto" },
    backgroundUrl: "",
    backgroundStyle: "none",
    order: 3,
    isVisible: true,
    status: "PUBLISHED",
  },
  {
    id: "default-about",
    sectionType: "about_preview",
    title: "DESIGN WITH INTENT",
    subtitle: "About",
    description: "",
    config: { ctaLabel: "More about me", ctaPath: "/about", showStats: true },
    backgroundUrl: "",
    backgroundStyle: "none",
    order: 4,
    isVisible: true,
    status: "PUBLISHED",
  },
  {
    id: "default-services",
    sectionType: "services_preview",
    title: "SERVICES",
    subtitle: "What I Do",
    description: "",
    config: { limit: 4 },
    backgroundUrl: "",
    backgroundStyle: "none",
    order: 5,
    isVisible: true,
    status: "PUBLISHED",
  },
  {
    id: "default-skills",
    sectionType: "skills_preview",
    title: "SKILLS & TOOLS",
    subtitle: "Toolkit",
    description: "",
    config: { limit: 6 },
    backgroundUrl: "",
    backgroundStyle: "none",
    order: 6,
    isVisible: true,
    status: "PUBLISHED",
  },
  {
    id: "default-testimonials",
    sectionType: "testimonials_preview",
    title: "TESTIMONIALS",
    subtitle: "Client Words",
    description: "",
    config: { limit: 3 },
    backgroundUrl: "",
    backgroundStyle: "none",
    order: 7,
    isVisible: true,
    status: "PUBLISHED",
  },
  {
    id: "default-contact",
    sectionType: "contact_cta",
    title: "Contact",
    subtitle: "Next step",
    description: "",
    config: {
      headline: "HAVE A PROJECT IN MIND?",
      sub: "LET'S MAKE SOMETHING REMARKABLE.",
      ctaLabel: "Start a Project",
      ctaPath: "/contact",
    },
    backgroundUrl: "",
    backgroundStyle: "gradient",
    order: 8,
    isVisible: true,
    status: "PUBLISHED",
  },
];
