"use client";

import { useRouter } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/api";
import type { NavigationItem } from "@/lib/cms-types";
import { Separator } from "@/components/ui/separator";
import { ArrowUpRight } from "lucide-react";

/** Legacy sitemap — fallback when the CMS navigation is empty/unreachable. */
const FALLBACK_FOOTER: NavigationItem[] = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Portfolio", path: "/portfolio" },
  { label: "Services", path: "/services" },
  { label: "Experience", path: "/experience" },
  { label: "Testimonials", path: "/testimonials" },
  { label: "Contact", path: "/contact" },
].map((link, i) => ({
  id: `fallback-footer-${i}`,
  label: link.label,
  path: link.path,
  position: "FOOTER",
  order: i,
  isVisible: true,
  openInNew: false,
}));

function isHttpPath(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

export function Footer() {
  const navigate = useRouter((s) => s.navigate);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: publicApi.settings, staleTime: 60_000 });
  const { data: profileData } = useQuery({ queryKey: ["profile"], queryFn: publicApi.profile, staleTime: 60_000 });
  const { data: navigation } = useQuery({ queryKey: ["navigation"], queryFn: publicApi.navigation, staleTime: 60_000 });

  const footerItems = navigation?.footer?.length ? navigation.footer : FALLBACK_FOOTER;
  const socials = profileData?.socialLinks ?? [];
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12 py-14 sm:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <p className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
              {(settings?.logoText || "Adrian Vale").replace(/®\s*$/, "")}<span className="text-primary">®</span>
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              {settings?.footerText ||
                "Independent graphic design practice crafting brand identities, editorial systems and visual experiences from 2016."}
            </p>
          </div>

          {/* Sitemap */}
          <nav aria-label="Footer navigation">
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Sitemap
            </p>
            <ul className="mt-5 space-y-2.5">
              {footerItems.map((item) => {
                const external = item.openInNew || isHttpPath(item.path);
                return (
                  <li key={item.id}>
                    {external ? (
                      <a
                        href={isHttpPath(item.path) ? item.path : `/#${item.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <button
                        onClick={() => navigate(item.path)}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {item.label}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Socials */}
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Elsewhere
            </p>
            <ul className="mt-5 space-y-2.5">
              {socials.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {s.label}
                    <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-border" />

        <div className="flex flex-col gap-3 sm:flex-row items-center justify-between text-xs text-muted-foreground">
          <p>
            © {year} {settings?.copyrightText || "Adrian Vale. All rights reserved."}
          </p>
          <p className="flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
            Available for select projects
          </p>
        </div>
      </div>
    </footer>
  );
}
