"use client";

import { motion } from "framer-motion";
import { useRouter } from "@/lib/router";
import { useSeo } from "@/hooks/use-seo";
import { ArrowLeft } from "lucide-react";

export function NotFoundView() {
  useSeo("404 — Page not found", "The page you are looking for does not exist.");
  const navigate = useRouter((s) => s.navigate);

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center noise-overlay">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_45%,rgba(198,255,0,0.10),transparent_65%)]"
        aria-hidden
      />
      <motion.p
        className="relative font-heading text-[clamp(6rem,22vw,16rem)] font-bold leading-none tracking-tight text-outline select-none"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Error 404"
      >
        4
        <motion.span
          className="inline-block text-primary"
          animate={{ rotate: [0, -12, 12, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          0
        </motion.span>
        4
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.7 }}
      >
        <p className="mt-6 font-editorial text-xl italic text-foreground/80">
          This page drifted off the artboard.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          The link may be broken, or the page may have been moved.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-10 inline-flex items-center gap-2 rounded-sm bg-primary px-7 py-4 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to Home
        </button>
      </motion.div>
    </section>
  );
}
