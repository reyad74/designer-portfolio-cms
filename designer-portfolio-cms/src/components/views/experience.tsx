"use client";

import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/api";
import { useSeo } from "@/hooks/use-seo";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/animations";
import { Download, Briefcase, GraduationCap, BadgeCheck, Trophy } from "lucide-react";

function fmt(d?: string | null) {
  if (!d) return "Present";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

export function ExperienceView() {
  useSeo(
    "Experience & Resume — {site}®",
    "Employment history, education, certifications and achievements of {site}."
  );
  const { data, isLoading } = useQuery({ queryKey: ["resume"], queryFn: publicApi.resume, staleTime: 60_000 });
  const { data: profileData } = useQuery({ queryKey: ["profile"], queryFn: publicApi.profile, staleTime: 60_000 });
  const cvUrl = profileData?.profile?.resumeUrl ?? null;

  if (isLoading) {
    return <div className="min-h-[70vh] bg-elevated animate-pulse" aria-label="Loading experience" />;
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-border pt-32 sm:pt-40 noise-overlay">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-8 px-5 pb-16 sm:px-8 lg:px-12">
          <div>
            <Reveal>
              <p className="font-heading text-xs tracking-[0.3em] text-primary">EXPERIENCE & RESUME</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-5 font-heading text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-none">
                THE <span className="font-editorial italic font-medium text-primary">JOURNEY</span>
              </h1>
            </Reveal>
          </div>
          {cvUrl && (
            <Reveal delay={0.15}>
              <a
                href={cvUrl}
                download
                className="inline-flex items-center gap-2 rounded-sm bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
              >
                <Download className="size-4" aria-hidden />
                Download CV (PDF)
              </a>
            </Reveal>
          )}
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12">
        <SectionHeading index="01" kicker="Employment" title="WORK HISTORY" />
        <div className="relative border-l border-border pl-8 sm:pl-12">
          {data?.experiences.map((e, i) => (
            <Reveal key={e.id} delay={i * 0.05} className="relative pb-14 last:pb-0">
              <span
                className="absolute -left-[37px] top-1.5 size-3 rounded-full border-2 border-primary bg-background sm:-left-[53px]"
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-heading text-xl sm:text-2xl font-semibold">
                  {e.role}
                  <span className="text-primary"> · </span>
                  <span className="text-muted-foreground">{e.company}</span>
                </h3>
                <span className="font-heading text-sm text-muted-foreground">
                  {fmt(e.startDate)} — {e.current ? "Present" : fmt(e.endDate)}
                </span>
              </div>
              {e.location && <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{e.location}</p>}
              {e.description && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{e.description}</p>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      {/* Education + certifications */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-[1600px] gap-16 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-12">
          <div>
            <SectionHeading index="02" kicker="Education" title="STUDY" className="mb-10" />
            <div className="space-y-8">
              {data?.education.map((ed, i) => (
                <Reveal key={ed.id} delay={i * 0.05}>
                  <div className="flex gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-muted">
                      <GraduationCap className="size-5 text-primary" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-heading font-semibold">{ed.degree}{ed.field ? ` — ${ed.field}` : ""}</h3>
                      <p className="text-sm text-muted-foreground">{ed.institution}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {fmt(ed.startDate)} — {fmt(ed.endDate)}
                      </p>
                      {ed.description && <p className="mt-2 text-sm text-muted-foreground">{ed.description}</p>}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <div>
            <SectionHeading index="03" kicker="Certifications" title="CREDENTIALS" className="mb-10" />
            <div className="space-y-6">
              {data?.certifications.map((c, i) => (
                <Reveal key={c.id} delay={i * 0.05}>
                  <div className="flex items-start gap-4 border border-border bg-background p-5">
                    <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold">{c.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {c.issuer}
                        {c.issueDate ? ` · ${fmt(c.issueDate)}` : ""}
                      </p>
                      {c.credentialUrl && (
                        <a
                          href={c.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-primary underline-offset-4 hover:underline"
                        >
                          View credential →
                        </a>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      {data?.achievements && data.achievements.length > 0 && (
        <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12">
          <SectionHeading index="04" kicker="Recognition" title="ACHIEVEMENTS" />
          <div className="grid gap-4 sm:grid-cols-2">
            {data.achievements.map((a, i) => (
              <Reveal key={a.id} delay={i * 0.05}>
                <div className="flex h-full items-start gap-4 border border-border bg-elevated p-6">
                  <Trophy className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-heading font-semibold">{a.title}</h3>
                      {a.year && <span className="font-heading text-sm text-primary">{a.year}</span>}
                    </div>
                    {a.organization && <p className="text-sm text-muted-foreground">{a.organization}</p>}
                    {a.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.description}</p>}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
