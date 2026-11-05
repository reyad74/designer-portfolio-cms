"use client";

import { motion } from "framer-motion";
import { Tilt } from "@/components/animations";
import { useRouter } from "@/lib/router";
import type { Project } from "@/lib/types";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * Editorial project card — asymmetric variants for grid rhythm.
 */
export function ProjectCard({
  project,
  variant = "tall",
  priority = false,
}: {
  project: Project;
  variant?: "tall" | "wide" | "standard";
  priority?: boolean;
}) {
  const navigate = useRouter((s) => s.navigate);
  const aspect =
    variant === "wide"
      ? "aspect-[16/9]"
      : variant === "tall"
        ? "aspect-[4/5]"
        : "aspect-[4/3]";

  return (
    <Tilt intensity={3}>
      <motion.article
        className="group relative cursor-pointer"
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        onClick={() => navigate(`/portfolio/${project.slug}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") navigate(`/portfolio/${project.slug}`);
        }}
        tabIndex={0}
        role="link"
        aria-label={`View project: ${project.title}`}
      >
        <div className={cn("relative overflow-hidden bg-elevated", aspect)}>
          {project.thumbnailUrl || project.coverUrl ? (
            <Image
              src={project.thumbnailUrl ?? project.coverUrl ?? ""}
              alt={project.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 620px"
              priority={priority}
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(198,255,0,0.12),transparent_60%)]" />
          )}
          {/* Cinematic hover veil */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-90" />
          <span className="absolute right-4 top-4 inline-flex size-10 translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
            <ArrowUpRight className="size-5" aria-hidden />
          </span>
          {project.featured && (
            <span className="absolute left-4 top-4 bg-primary/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
              Featured
            </span>
          )}
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-primary">
              {project.category?.name ?? "Design"}
            </p>
            <h3 className="mt-1.5 font-heading text-xl sm:text-2xl font-semibold tracking-tight transition-colors group-hover:text-primary">
              {project.title}
            </h3>
          </div>
          <span className="pt-1 font-heading text-sm text-muted-foreground">
            {project.year ?? new Date(project.projectDate ?? Date.now()).getFullYear()}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {project.summary}
        </p>
      </motion.article>
    </Tilt>
  );
}
