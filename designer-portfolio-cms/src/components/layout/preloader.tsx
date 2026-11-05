"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSiteName } from "@/hooks/use-seo";
import { monogramFromSiteName } from "@/lib/utils";

const noopSubscribe = () => () => {};

/**
 * Cinematic preloader shown only on the very first load of the session.
 * SSR-safe: reads sessionStorage through useSyncExternalStore instead of
 * setState-in-effect.
 */
export function Preloader() {
  const siteName = useSiteName();
  const alreadyPreloaded = useSyncExternalStore(
    noopSubscribe,
    () => sessionStorage.getItem("av_preloaded") === "1",
    () => true // on the server, never show a preloader
  );

  const [done, setDone] = useState(false);
  const visible = !alreadyPreloaded && !done;

  useEffect(() => {
    if (alreadyPreloaded) return;
    const t = setTimeout(() => {
      setDone(true);
      sessionStorage.setItem("av_preloaded", "1");
    }, 1400);
    return () => clearTimeout(t);
  }, [alreadyPreloaded]);

  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background"
      initial={{ opacity: 1 }}
      animate={done ? { y: "-100%" } : { y: 0 }}
      transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => done && setDone(true)}
      aria-hidden
    >
      <div className="overflow-hidden">
        <motion.p
          className="font-heading text-4xl sm:text-6xl font-bold tracking-tight"
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {monogramFromSiteName(siteName)}<span className="text-primary">®</span>
        </motion.p>
      </div>
      <motion.div
        className="absolute bottom-0 left-0 h-[2px] bg-primary"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
