"use client";

import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/api";
import { useSeo } from "@/hooks/use-seo";
import { useRouter } from "@/lib/router";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/animations";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

function safeArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function ServicesView() {
  useSeo(
    "Services — {site}®",
    "Brand identity, logo, packaging, print, UI/UX, motion and 3D visual design services."
  );
  const navigate = useRouter((s) => s.navigate);
  const { data, isLoading } = useQuery({ queryKey: ["services"], queryFn: publicApi.services, staleTime: 60_000 });

  if (isLoading) {
    return <div className="min-h-[70vh] bg-elevated animate-pulse" aria-label="Loading services" />;
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-border pt-32 sm:pt-40 noise-overlay">
        <div className="mx-auto max-w-[1600px] px-5 pb-16 sm:px-8 lg:px-12">
          <Reveal>
            <p className="font-heading text-xs tracking-[0.3em] text-primary">SERVICES</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-5 font-heading text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-none">
              HOW I CAN <span className="font-editorial italic font-medium text-primary">HELP</span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              End-to-end creative services — from strategic discovery to final artwork and
              production-ready files.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12">
        <div className="space-y-px border border-border bg-border">
          {data?.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.04}>
              <article className="group grid gap-8 bg-background p-8 transition-colors duration-300 hover:bg-elevated lg:grid-cols-[0.35fr_1fr_0.75fr] lg:p-10">
                <div>
                  <span className="font-heading text-sm text-primary">({String(i + 1).padStart(2, "0")})</span>
                  <h2 className="mt-3 font-heading text-2xl sm:text-3xl font-semibold tracking-tight transition-colors group-hover:text-primary">
                    {s.title}
                  </h2>
                </div>
                <div className="space-y-5">
                  <p className="text-base leading-relaxed text-foreground/90">{s.shortDescription}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                  {s.approach && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Approach
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{s.approach}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-between gap-8">
                  {safeArray(s.deliverables).length > 0 && (
                    <ul className="space-y-2.5">
                      {safeArray(s.deliverables).map((d) => (
                        <li key={d} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => navigate("/contact")}
                    className="inline-flex w-fit items-center gap-2 border-b border-primary pb-1 text-sm font-semibold text-primary transition-all hover:gap-3"
                  >
                    Enquire about this service
                    <ArrowUpRight className="size-4" aria-hidden />
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Honest scope note */}
        <Reveal className="mt-10">
          <p className="text-center text-xs text-muted-foreground">
            Every engagement is scoped individually — timelines and investment are discussed after a short
            discovery call. No fixed price lists, no surprises.
          </p>
        </Reveal>
      </section>
    </>
  );
}
