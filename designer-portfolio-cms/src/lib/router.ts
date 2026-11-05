import { create } from "zustand";

/**
 * Hash-based SPA router.
 * The preview sandbox only exposes the `/` route, so every "page" of the site
 * is a deep-linkable hash route: #/portfolio/<slug>, #/admin, etc.
 */
export type RoutePath =
  | "/"
  | "/about"
  | "/portfolio"
  | `/portfolio/${string}`
  | "/services"
  | "/skills"
  | "/experience"
  | "/testimonials"
  | "/contact"
  | "/admin"
  | "/preview/home"
  | `/preview/project/${string}`
  | string;

interface RouterState {
  path: RoutePath;
  setPath: (path: RoutePath) => void;
  navigate: (to: RoutePath) => void;
}

function currentHashPath(): RoutePath {
  if (typeof window === "undefined") return "/";
  const raw = window.location.hash.replace(/^#/, "");
  const path = raw.startsWith("/") ? raw : raw ? `/${raw}` : "/";
  return path;
}

export const useRouter = create<RouterState>((set) => ({
  path: "/",
  setPath: (path) => set({ path }),
  navigate: (to) => {
    if (typeof window === "undefined") return;
    if (window.location.hash.replace(/^#/, "") === to) {
      // Same route: just scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.location.hash = to;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  },
}));

/** Sync the store with the browser hash. Call once in the app shell. */
export function initRouter() {
  if (typeof window === "undefined") return () => {};
  const sync = () => useRouter.getState().setPath(currentHashPath());
  sync();
  window.addEventListener("hashchange", sync);
  return () => window.removeEventListener("hashchange", sync);
}

export function parseRoute(path: string) {
  const segs = path.split("/").filter(Boolean);
  if (segs.length === 0) return { view: "home" as const };
  switch (segs[0]) {
    case "about":
      return { view: "about" as const };
    case "portfolio":
      return segs[1]
        ? { view: "case" as const, slug: decodeURIComponent(segs[1]) }
        : { view: "portfolio" as const };
    case "services":
      return { view: "services" as const };
    case "skills":
      return { view: "skills" as const };
    case "experience":
      return { view: "experience" as const };
    case "testimonials":
      return { view: "testimonials" as const };
    case "contact":
      return { view: "contact" as const };
    case "admin":
      return { view: "admin" as const };
    case "preview":
      // Admin-only draft previews: #/preview/home and #/preview/project/<slug>
      if (segs[1] === "home") return { view: "preview-home" as const };
      if (segs[1] === "project" && segs[2]) {
        return { view: "preview-project" as const, slug: decodeURIComponent(segs[2]) };
      }
      return { view: "notfound" as const };
    default:
      return { view: "notfound" as const };
  }
}

export const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Portfolio", path: "/portfolio" },
  { label: "Services", path: "/services" },
  { label: "Contact", path: "/contact" },
] as const;
