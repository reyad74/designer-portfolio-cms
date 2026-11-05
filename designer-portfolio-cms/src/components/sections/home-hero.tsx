"use client";

import { motion } from "framer-motion";
import { Hero3D, type HeroFlags } from "@/components/three-d/hero-3d";
import { Counter, Magnetic, RevealLines } from "@/components/animations";
import { useRouter } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/api";
import type { SettingsWithFlags } from "@/components/sections/section-renderer";
import type { HomepageSection } from "@/lib/cms-types";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

const AVAILABILITY_LABEL: Record<string, string> = {
  AVAILABLE: "Available for new projects",
  LIMITED: "Limited availability — Q1 booking",
  UNAVAILABLE: "Currently booked out",
};

const FALLBACK_HEADLINES = [
  "I DON'T JUST DESIGN.",
  "I CREATE VISUAL",
  "EXPERIENCES.",
];

const FALLBACK_STATS: HeroStat[] = [
  { value: "9+", label: "Years" },
  { value: "60+", label: "Clients" },
  { value: "120+", label: "Projects" },
];

interface HeroStat {
  value: string;
  label: string;
}

/* ── Config readers (fallback-safe) ─────────────────────────────────────── */

function readLines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return FALLBACK_HEADLINES;
  const lines = raw.map((l) => String(l ?? "").trim()).filter(Boolean);
  return lines.length ? lines : FALLBACK_HEADLINES;
}

function readCta(raw: unknown, fallbackLabel: string, fallbackPath: string) {
  const obj = (raw ?? null) as { label?: unknown; path?: unknown } | null;
  const label = typeof obj?.label === "string" && obj.label.trim() ? obj.label : fallbackLabel;
  const path = typeof obj?.path === "string" && obj.path.trim() ? obj.path : fallbackPath;
  return { label, path };
}

function readStats(raw: unknown): HeroStat[] {
  if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_STATS;
  const stats = raw
    .map((s) => {
      const item = (s ?? {}) as { value?: unknown; label?: unknown };
      return { value: String(item.value ?? "").trim(), label: String(item.label ?? "").trim() };
    })
    .filter((s) => s.value);
  return stats.length ? stats : FALLBACK_STATS;
}

/** "9+" → { to: 9, suffix: "+" }, or null when the value is not countable. */
function statParts(value: string): { to: number; suffix: string } | null {
  const m = /^(\d+)\s*(.*)$/.exec(value.trim());
  return m ? { to: Number(m[1]), suffix: m[2] } : null;
}

/* ── Headline styling helpers (keeps the designed editorial treatment
   for any CMS-provided lines: plain → accent → outline) ─────────────────── */

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

function heroLineNode(line: string, i: number, total: number): ReactNode {
  if (i === 0) return <>{line}</>;
  if (i === total - 1) return <span className="text-outline">{line}</span>;
  return accentLastWord(line);
}

/* ── Hero ───────────────────────────────────────────────────────────────── */

export function HomeHero({ section }: { section?: HomepageSection }) {
  const navigate = useRouter((s) => s.navigate);

  // Availability badge + socials still come from the profile endpoint
  // (same query key as other sections — shared, deduplicated cache).
  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: publicApi.profile,
    staleTime: 60_000,
  });

  // CMS motion flags (documented settings-flag cast)
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: publicApi.settings,
    staleTime: 60_000,
  });
  const siteFlags = settings as SettingsWithFlags | null;
  const heroFlags: HeroFlags = {
    hero3dEnabled: siteFlags?.hero3dEnabled,
    particlesEnabled: siteFlags?.particlesEnabled,
    animationIntensity: siteFlags?.animationIntensity,
    parallaxEnabled: siteFlags?.parallaxEnabled,
    heroFallbackUrl: siteFlags?.heroFallbackUrl || undefined,
  };

  const config = (section?.config ?? {}) as Record<string, unknown>;
  const lines = readLines(config.headlineLines);
  const ctaPrimary = readCta(config.ctaPrimary, "View My Work", "/portfolio");
  const ctaSecondary = readCta(config.ctaSecondary, "Let's Collaborate", "/contact");
  const showStats = config.showStats !== false;
  const stats = readStats(config.stats);

  const name = profileData?.profile?.name ?? "Adrian Vale";
  const title = profileData?.profile?.title ?? "Graphic Designer & Art Director";

  const availabilityColor =
    profileData?.profile?.availabilityStatus === "AVAILABLE"
      ? "bg-primary"
      : profileData?.profile?.availabilityStatus === "LIMITED"
        ? "bg-yellow-400"
        : "bg-red-400";

  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden noise-overlay editorial-grid-bg">
      <Hero3D flags={heroFlags} />

      {/* Legibility gradient above canvas */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/85 via-background/35 to-transparent" aria-hidden />
      {/* Stronger veil on small screens where text spans the full width */}
      <div className="pointer-events-none absolute inset-0 bg-background/55 sm:bg-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" aria-hidden />

      <div className="pointer-events-none relative z-10 mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 pb-24 pt-32">
        <div className="pointer-events-auto max-w-4xl">
          {/* Availability */}
          <motion.div
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-border bg-card/60 px-4 py-2 backdrop-blur"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <span className={`relative flex size-2`}>
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${availabilityColor} opacity-60`} />
              <span className={`relative inline-flex size-2 rounded-full ${availabilityColor}`} />
            </span>
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              {profileData?.profile?.availabilityNote ||
                AVAILABILITY_LABEL[profileData?.profile?.availabilityStatus ?? "AVAILABLE"]}
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="font-heading font-bold tracking-tight leading-[0.98] text-[clamp(2.75rem,8vw,6.5rem)]">
            <RevealLines
              delay={0.25}
              lines={lines.map((line, i) => heroLineNode(line, i, lines.length))}
            />
          </h1>

          <motion.p
            className="mt-8 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
          >
            {name} — {title}. {profileData?.profile?.shortBio ||
              "Transforming ideas into meaningful visual identities through creativity, strategy and design."}
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="mt-10 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
          >
            <Magnetic>
              <button
                onClick={() => navigate(ctaPrimary.path)}
                className="inline-flex items-center gap-2 rounded-sm bg-primary px-7 py-4 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
              >
                {ctaPrimary.label}
                <ArrowUpRight className="size-4" aria-hidden />
              </button>
            </Magnetic>
            <Magnetic>
              <button
                onClick={() => navigate(ctaSecondary.path)}
                className="inline-flex items-center gap-2 rounded-sm border border-border bg-card/40 px-7 py-4 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-primary hover:text-primary"
              >
                {ctaSecondary.label}
              </button>
            </Magnetic>
          </motion.div>

          {/* Stats */}
          {showStats && (
            <motion.div
              className="mt-12 flex max-w-xl flex-wrap gap-x-10 gap-y-6 border-t border-border pt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.05 }}
            >
              {stats.map((s) => {
                const parts = statParts(s.value);
                return (
                  <div key={s.label}>
                    <p className="font-heading text-3xl sm:text-4xl font-bold">
                      {parts ? <Counter to={parts.to} suffix={parts.suffix} /> : s.value}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Socials */}
          <motion.div
            className="mt-12 flex items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
          >
            {profileData?.socialLinks?.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
              >
                {s.label}
              </a>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        aria-hidden
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <ArrowDown className="size-4" />
        </motion.div>
      </motion.div>
    </section>
  );
}
