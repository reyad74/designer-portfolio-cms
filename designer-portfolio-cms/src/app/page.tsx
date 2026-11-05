"use client";

import { useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { initRouter, parseRoute, useRouter } from "@/lib/router";
import { useLenis } from "@/hooks/use-lenis";
import { useHydrated } from "@/hooks/use-media-query";
import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/services/api";
import { applyTheme } from "@/lib/theme";
import type { SettingsWithFlags } from "@/components/sections/section-renderer";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CustomCursor } from "@/components/layout/custom-cursor";
import { Preloader } from "@/components/layout/preloader";
import { ScrollProgress } from "@/components/layout/scroll-progress";

import { HomeView } from "@/components/views/home";
import { AboutView } from "@/components/views/about";
import { PortfolioView } from "@/components/views/portfolio";
import { CaseStudyView } from "@/components/views/case-study";
import { ServicesView } from "@/components/views/services";
import { SkillsView } from "@/components/views/skills";
import { ExperienceView } from "@/components/views/experience";
import { TestimonialsView } from "@/components/views/testimonials";
import { ContactView } from "@/components/views/contact";
import { NotFoundView } from "@/components/views/not-found";
import { PreviewHomeView } from "@/components/views/preview-home";
import { PreviewProjectView } from "@/components/views/preview-project";
import { AdminView } from "@/components/views/admin/admin-view";

const noopSubscribe = () => () => {};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: 1 },
    },
  });
}

export default function Page() {
  const queryClient = useMemo(() => makeQueryClient(), []);
  const hydrated = useHydrated();

  // Subscribe the zustand router to hashchange (external system sync)
  useEffect(() => initRouter(), []);

  if (!hydrated) {
    // Initial client render matches the server shell exactly
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center bg-background">
        <p className="font-heading text-2xl font-bold">
          AV<span className="text-primary">®</span>
        </p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}

function AppShell() {
  const path = useRouter((s) => s.path);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: publicApi.settings,
    staleTime: 60_000,
  });

  // Admin-controlled theme (ThemeConfig) → CSS variables
  const { data: theme } = useQuery({
    queryKey: ["theme"],
    queryFn: publicApi.theme,
    staleTime: 30_000,
  });
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const route = parseRoute(path);
  const siteName = (settings?.logoText || "Adrian Vale").replace(/®\s*$/, "");

  // Chromeless routes (admin + admin draft previews) render without public chrome
  const isChromeless =
    route.view === "admin" || route.view === "preview-home" || route.view === "preview-project";

  // CMS motion flags ride on the settings payload (documented settings-flag cast)
  const siteFlags = settings as SettingsWithFlags | null;

  useLenis(path !== "/admin" && siteFlags?.smoothScrollEnabled !== false);

  const viewKey =
    route.view === "case"
      ? `case-${route.slug}`
      : route.view === "preview-project"
        ? `preview-project-${route.slug}`
        : route.view;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Preloader />
      {!isChromeless && siteFlags?.cursorEffectEnabled !== false && <CustomCursor />}
      {!isChromeless && <ScrollProgress />}

      {!isChromeless && <Navbar siteName={siteName} />}

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewKey}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {route.view === "home" && <HomeView />}
            {route.view === "about" && <AboutView />}
            {route.view === "portfolio" && <PortfolioView />}
            {route.view === "case" && <CaseStudyView slug={route.slug} />}
            {route.view === "services" && <ServicesView />}
            {route.view === "skills" && <SkillsView />}
            {route.view === "experience" && <ExperienceView />}
            {route.view === "testimonials" && <TestimonialsView />}
            {route.view === "contact" && <ContactView />}
            {route.view === "preview-home" && <PreviewHomeView />}
            {route.view === "preview-project" && <PreviewProjectView slug={route.slug} />}
            {route.view === "notfound" && <NotFoundView />}
            {route.view === "admin" && <AdminView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {!isChromeless && <Footer />}
    </div>
  );
}
