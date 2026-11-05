"use client";

import { Reveal } from "@/components/animations";
import { cn } from "@/lib/utils";

export function SectionHeading({
  kicker,
  title,
  index,
  align = "left",
  className,
}: {
  kicker: string;
  title: string;
  index?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <Reveal className={cn("mb-10 sm:mb-14", className)}>
      <div
        className={cn(
          "flex items-center gap-3 mb-4",
          align === "center" && "justify-center"
        )}
      >
        {index && (
          <span className="font-heading text-xs text-primary tracking-[0.25em]">
            {index}
          </span>
        )}
        <span className="h-px w-10 bg-primary/60" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          {kicker}
        </span>
      </div>
      <h2
        className={cn(
          "font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.02]",
          align === "center" && "text-center"
        )}
      >
        {title}
      </h2>
    </Reveal>
  );
}
