"use client";

import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/api";
import { useSeo } from "@/hooks/use-seo";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/animations";
import { Quote, Star } from "lucide-react";

export function TestimonialsView() {
  useSeo(
    "Testimonials — {site}®",
    "What clients say about working with {site}."
  );
  const { data, isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: publicApi.testimonials,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="min-h-[70vh] bg-elevated animate-pulse" aria-label="Loading testimonials" />;
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-border pt-32 sm:pt-40 noise-overlay">
        <div className="mx-auto max-w-[1600px] px-5 pb-16 sm:px-8 lg:px-12">
          <Reveal>
            <p className="font-heading text-xs tracking-[0.3em] text-primary">TESTIMONIALS</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-5 font-heading text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-none">
              KIND <span className="font-editorial italic font-medium text-primary">WORDS</span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Published reviews from real engagements — collected after delivery, shared with permission.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12">
        {data?.length ? (
          <div className="columns-1 gap-6 md:columns-2 xl:columns-3 [&>*]:mb-6">
            {data.map((t, i) => (
              <Reveal key={t.id} delay={Math.min(i * 0.05, 0.3)} className="break-inside-avoid">
                <figure className="border border-border bg-elevated p-7 transition-colors hover:border-primary/40">
                  <div className="flex items-center justify-between">
                    <Quote className="size-6 text-primary" aria-hidden />
                    {t.rating ? (
                      <div className="flex gap-0.5" aria-label={`Rated ${t.rating} out of 5`}>
                        {[...Array(t.rating)].map((_, j) => (
                          <Star key={j} className="size-3.5 fill-primary text-primary" aria-hidden />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <blockquote className="mt-5 text-sm sm:text-base leading-relaxed text-foreground/90">
                    &ldquo;{t.review}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 border-t border-border pt-5">
                    <p className="font-heading font-semibold">{t.clientName}</p>
                    <p className="text-sm text-muted-foreground">{t.company}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {t.projectReference && <span className="text-primary">{t.projectReference}</span>}
                      {t.date && (
                        <span>
                          {new Date(t.date).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                        </span>
                      )}
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="py-20 text-center text-muted-foreground">Testimonials are being collected — check back soon.</p>
        )}
      </section>
    </>
  );
}
