"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { publicApi } from "@/services/api";
import { useSeo } from "@/hooks/use-seo";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal, Tilt } from "@/components/animations";
import { PenTool, Compass } from "lucide-react";

export function SkillsView() {
  useSeo(
    "Skills & Expertise — {site}®",
    "Design toolkit: Adobe Creative Suite, Figma, Blender, Cinema 4D and core design disciplines."
  );
  const { data, isLoading } = useQuery({ queryKey: ["skills"], queryFn: publicApi.skills, staleTime: 60_000 });

  if (isLoading) {
    return <div className="min-h-[70vh] bg-elevated animate-pulse" aria-label="Loading skills" />;
  }

  const software = data?.filter((s) => s.category === "SOFTWARE") ?? [];
  const expertise = data?.filter((s) => s.category === "EXPERTISE") ?? [];

  return (
    <>
      <section className="relative overflow-hidden border-b border-border pt-32 sm:pt-40 noise-overlay">
        <div className="mx-auto max-w-[1600px] px-5 pb-16 sm:px-8 lg:px-12">
          <Reveal>
            <p className="font-heading text-xs tracking-[0.3em] text-primary">SKILLS & EXPERTISE</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-5 font-heading text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-none">
              THE <span className="font-editorial italic font-medium text-primary">TOOLKIT</span>
            </h1>
          </Reveal>
        </div>
      </section>

      {/* Software */}
      <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12">
        <SectionHeading index="01" kicker="Software" title="TOOLS OF THE TRADE" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {software.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.04}>
              <Tilt intensity={4}>
                <div className="border border-border bg-elevated p-6 transition-colors hover:border-primary/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-sm bg-muted">
                        <PenTool className="size-4.5 text-primary" aria-hidden />
                      </span>
                      <h3 className="font-heading font-semibold">{s.name}</h3>
                    </div>
                    <span className="font-heading text-sm text-muted-foreground">{s.level}%</span>
                  </div>
                  <div className="mt-5 h-[3px] w-full bg-muted">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.level}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Expertise */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12">
          <SectionHeading index="02" kicker="Expertise" title="CRAFT & DISCIPLINES" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {expertise.map((s, i) => (
              <Reveal key={s.id} delay={i * 0.04}>
                <div className="group flex h-full flex-col justify-between gap-6 border border-border bg-background p-6 transition-colors hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-sm bg-muted">
                      <Compass className="size-4 text-primary" aria-hidden />
                    </span>
                    <h3 className="font-heading font-semibold">{s.name}</h3>
                  </div>
                  <div>
                    <div className="h-[3px] w-full bg-muted">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${s.level}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.1 + i * 0.05 }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{s.level}% mastery</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
