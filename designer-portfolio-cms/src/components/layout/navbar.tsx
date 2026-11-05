"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter, NAV_LINKS } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/api";
import type { NavigationItem } from "@/lib/cms-types";
import { cn } from "@/lib/utils";
import { Menu, X, ArrowUpRight } from "lucide-react";

/** Legacy header links — fallback when the CMS navigation is empty/unreachable. */
const FALLBACK_HEADER: NavigationItem[] = NAV_LINKS.map((link, i) => ({
  id: `fallback-header-${i}`,
  label: link.label,
  path: link.path,
  position: "HEADER",
  order: i,
  isVisible: true,
  openInNew: false,
}));

const FALLBACK_MOBILE_EXTRA: NavigationItem = {
  id: "fallback-header-experience",
  label: "Experience",
  path: "/experience",
  position: "HEADER",
  order: 99,
  isVisible: true,
  openInNew: false,
};

function isHttpPath(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

export function Navbar({ siteName }: { siteName: string }) {
  const path = useRouter((s) => s.path);
  const navigate = useRouter((s) => s.navigate);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // CMS-driven navigation (header position); fallback to legacy links on error/empty.
  const { data: navigation } = useQuery({
    queryKey: ["navigation"],
    queryFn: publicApi.navigation,
    staleTime: 60_000,
  });
  const headerItems = navigation?.header?.length ? navigation.header : FALLBACK_HEADER;
  const mobileItems = navigation?.header?.length
    ? navigation.header
    : [...FALLBACK_HEADER, FALLBACK_MOBILE_EXTRA];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    // SSR renders with scrolled=false (matches initial state); updates come
    // from passive scroll events — no synchronous setState in the effect body.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes
  // (adjust-state-during-render pattern — no cascading effect)
  const [prevPath, setPrevPath] = useState(path);
  if (prevPath !== path) {
    setPrevPath(path);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (p: string) =>
    p === "/" ? path === "/" : path === p || path.startsWith(p + "/");

  const externalHref = (item: NavigationItem) =>
    isHttpPath(item.path) ? item.path : `/#${item.path}`;

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-500",
          scrolled ? "glass shadow-[0_8px_40px_rgba(0,0,0,0.45)]" : "bg-transparent"
        )}
      >
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-12 h-16 sm:h-20"
        >
          {/* Wordmark */}
          <button
            onClick={() => navigate("/")}
            className="group flex items-baseline gap-2 font-heading text-lg sm:text-xl font-semibold tracking-tight"
            aria-label={`${siteName} — home`}
          >
            <span className="text-foreground">{siteName}</span>
            <span className="text-primary text-base leading-none">®</span>
          </button>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-1">
            {headerItems.map((item) => {
              const external = item.openInNew || isHttpPath(item.path);
              const active = !external && isActive(item.path);
              return (
                <li key={item.id}>
                  {external ? (
                    <a
                      href={externalHref(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative inline-flex items-center gap-1 px-4 py-2 text-sm tracking-wide text-muted-foreground transition-colors duration-300 hover:text-foreground"
                    >
                      {item.label}
                      <ArrowUpRight className="size-3.5" aria-hidden />
                    </a>
                  ) : (
                    <button
                      onClick={() => navigate(item.path)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative px-4 py-2 text-sm tracking-wide transition-colors duration-300",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {item.label}
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-x-3 -bottom-0.5 h-px bg-primary"
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      )}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/contact")}
              className="hidden md:inline-flex items-center gap-1.5 rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:scale-[1.03] active:scale-95"
            >
              Hire Me
              <ArrowUpRight className="size-4" aria-hidden />
            </button>

            {/* Mobile trigger */}
            <button
              className="md:hidden inline-flex items-center justify-center size-11 rounded-sm border border-border"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex h-16 items-center justify-between px-5">
              <span className="font-heading text-lg font-semibold">{siteName}®</span>
              <button
                className="inline-flex items-center justify-center size-11 rounded-sm border border-border"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <motion.ul
              className="flex flex-1 flex-col justify-center gap-2 px-8 pb-24"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
            >
              {mobileItems.map((item) => {
                const external = item.openInNew || isHttpPath(item.path);
                const active = !external && isActive(item.path);
                return (
                  <motion.li
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, y: 24 },
                      show: { opacity: 1, y: 0 },
                    }}
                  >
                    {external ? (
                      <a
                        href={externalHref(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 font-heading text-4xl sm:text-5xl font-semibold tracking-tight py-2 text-foreground"
                      >
                        {item.label}
                        <ArrowUpRight className="size-6 text-primary" aria-hidden />
                      </a>
                    ) : (
                      <button
                        onClick={() => navigate(item.path)}
                        className={cn(
                          "font-heading text-4xl sm:text-5xl font-semibold tracking-tight py-2 transition-colors",
                          active ? "text-primary" : "text-foreground"
                        )}
                      >
                        {item.label}
                      </button>
                    )}
                  </motion.li>
                );
              })}
              <motion.li
                variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
                className="pt-8"
              >
                <button
                  onClick={() => navigate("/contact")}
                  className="inline-flex items-center gap-2 rounded-sm bg-primary px-8 py-4 text-base font-semibold text-primary-foreground"
                >
                  Hire Me <ArrowUpRight className="size-5" aria-hidden />
                </button>
              </motion.li>
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
