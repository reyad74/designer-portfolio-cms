"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useMediaQuery, useWebGLSupport } from "@/hooks/use-media-query";

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => null,
});

/**
 * CMS-driven hero motion flags (subset of the /api/v1/settings payload).
 * Undefined = enabled; intensity defaults to 70 further down the chain.
 */
export interface HeroFlags {
  hero3dEnabled?: boolean;
  particlesEnabled?: boolean;
  animationIntensity?: number;
  parallaxEnabled?: boolean;
  heroFallbackUrl?: string;
}

/**
 * WebGL-capability + reduced-motion + CMS-flag aware wrapper with a graceful
 * static fallback so the hero never blocks content or crashes without WebGL.
 */
export function Hero3D({ flags }: { flags?: HeroFlags }) {
  const mobile = useMediaQuery("(max-width: 640px)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const webgl = useWebGLSupport();
  const disabledByCMS = flags?.hero3dEnabled === false;
  const fallback = disabledByCMS || reduced || !webgl;

  if (fallback) {
    // Admin-provided static image wins over the procedural gradient fallback.
    if (flags?.heroFallbackUrl) {
      return (
        <div className="absolute inset-0" aria-hidden>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${flags.heroFallbackUrl}")` }}
          />
          <div className="absolute inset-0 bg-background/45" />
        </div>
      );
    }
    return (
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_60%_40%,rgba(198,255,0,0.10),transparent_65%)]" />
        <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
        <div className="absolute left-1/2 top-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      </div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      <HeroScene mobile={mobile} flags={flags} />
    </motion.div>
  );
}
