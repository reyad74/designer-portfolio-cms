"use client";

import { useSyncExternalStore } from "react";

/**
 * SSR-safe media query hook built on useSyncExternalStore —
 * no setState-in-effect, hydration friendly.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** True only after client hydration — matches server render as false. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

let webglSupport: boolean | null = null;
function checkWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    webglSupport = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

export function useWebGLSupport(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => checkWebGL(),
    () => true
  );
}
