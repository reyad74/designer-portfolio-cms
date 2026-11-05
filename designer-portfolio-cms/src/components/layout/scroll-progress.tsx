"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  return (
    <motion.div
      className="fixed top-0 inset-x-0 z-[55] h-[2px] origin-left bg-primary"
      style={{ scaleX }}
      aria-hidden
    />
  );
}
