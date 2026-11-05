"use client";

import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/api";
import { useSeo } from "@/hooks/use-seo";
import { useRouter } from "@/lib/router";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal, RevealLines, Counter } from "@/components/animations";
import { Fragment } from "react";
import { Download, MapPin, ArrowUpRight } from "lucide-react";
import Image from "next/image";

export function AboutView() {
  useSeo(
    "About — {site}®",
    "Biography, career journey, design philosophy and achievements of {site}."
  );
  const navigate = useRouter((s) => s.navigate);
  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: publicApi.profile, staleTime: 60_000 });
  const p = data?.profile;

  if (isLoading) {
    return <div className="min-h-[70vh] bg-elevated animate-pulse" aria-label="Loading about" />;
  }

  return (
    <>
      {/* Profile intro */}
      <section className="relative overflow-hidden border-b border-border pt-32 sm:pt-40 noise-overlay">
        <div className="mx-auto grid max-w-[1600px] gap-12 px-5 pb-20 sm:px-8 lg:grid-cols-[0.9fr_1.4fr] lg:gap-20 lg:px-12">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden bg-elevated">
              {p?.photoUrl ? (
                <Image
                  src={p.photoUrl}
                  alt={`Portrait of ${p?.name}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 480px"
                  className="object-cover object-top"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(198,255,0,0.08),transparent_60%)]" />
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {p?.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" aria-hidden />
                  {p.location}
                </span>
              )}
              {p?.email && (
                <a href={`mailto:${p.email}`} className="transition-colors hover:text-primary">
                  {p.email}
                </a>
              )}
            </div>
            {p?.resumeUrl && (
              <a
                href={p.resumeUrl}
                download
                className="mt-6 inline-flex items-center gap-2 rounded-sm bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
              >
                <Download className="size-4" aria-hidden />
                Download CV
              </a>
            )}
          </Reveal>

          <div>
            <Reveal>
              <p className="font-heading text-xs tracking-[0.3em] text-primary">ABOUT ME</p>
            </Reveal>
            <RevealLines
              className="mt-6 font-heading text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.98]"
              lines={[
                <Fragment key="name">{p?.name ?? "Adrian Vale"}</Fragment>,
                <span key="outline" className="text-outline">DESIGNER</span>,
                <Fragment key="title">{p?.title ?? ""}</Fragment>,
              ]}
            />
            <Reveal delay={0.2}>
              <p className="mt-10 max-w-2xl text-lg leading-relaxed text-foreground/90">{p?.shortBio}</p>
            </Reveal>
            <Reveal delay={0.25}>
              <div className="mt-8 space-y-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
                {(p?.bio ?? "").split("\n").filter(Boolean).slice(0, 6).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.3} className="mt-12 grid grid-cols-3 gap-6 border-t border-border pt-10 max-w-xl">
              {[
                { label: "Years", value: p?.yearsExperience ?? 9 },
                { label: "Clients", value: p?.clientCount ?? 60 },
                { label: "Projects", value: p?.projectCount ?? 120 },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-heading text-4xl font-bold text-primary">
                    <Counter to={s.value} suffix="+" />
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      {p?.philosophy && (
        <section className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-12">
          <SectionHeading index="P" kicker="Creative Philosophy" title={p.philosophyTitle || "DESIGN WITH INTENT"} />
          <Reveal>
            <blockquote className="max-w-4xl border-l-2 border-primary pl-8 font-editorial text-2xl sm:text-3xl leading-relaxed text-foreground/90 italic">
              &ldquo;{p.philosophy}&rdquo;
            </blockquote>
          </Reveal>
        </section>
      )}

      {/* Interests */}
      {p?.interests && (
        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 lg:px-12">
            <Reveal>
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">Beyond the desk</p>
              <p className="mt-4 font-editorial text-xl sm:text-2xl italic text-foreground/80">{p.interests}</p>
            </Reveal>
          </div>
        </section>
      )}

      {/* Achievements strip */}
      <AchievementsStrip />

      {/* CTA */}
      <div className="mx-auto max-w-[1600px] px-5 py-20 text-center sm:px-8 lg:px-12">
        <Reveal>
          <button
            onClick={() => navigate("/contact")}
            className="group inline-flex items-center gap-3 rounded-full border border-primary px-9 py-4.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Work with me
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </button>
        </Reveal>
      </div>
    </>
  );
}

function AchievementsStrip() {
  const { data } = useQuery({ queryKey: ["resume"], queryFn: publicApi.resume, staleTime: 60_000 });
  const achievements = data?.achievements ?? [];
  if (achievements.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-12">
      <SectionHeading index="A" kicker="Recognition" title="ACHIEVEMENTS" />
      <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
        {achievements.map((a, i) => (
          <Reveal key={a.id} delay={i * 0.05}>
            <div className="flex h-full flex-col gap-2 bg-background p-8 transition-colors hover:bg-elevated">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-heading text-lg font-semibold">{a.title}</h3>
                {a.year && <span className="font-heading text-sm text-primary">{a.year}</span>}
              </div>
              {a.organization && (
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{a.organization}</p>
              )}
              {a.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.description}</p>}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
