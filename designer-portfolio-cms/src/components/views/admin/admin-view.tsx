"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/api";
import { AdminLogin } from "./admin-login";
import { AdminOverview } from "./admin-overview";
import { AdminProjects } from "./admin-projects";
import { AdminSimpleCrud } from "./admin-simple-crud";
import { AdminResume } from "./admin-resume";
import { AdminInquiries } from "./admin-inquiries";
import { AdminMedia } from "./admin-media";
import { AdminProfileSettings } from "./admin-profile-settings";
import { AdminHomepage } from "./admin-homepage";
import { AdminTheme } from "./admin-theme";
import { AdminNavigation } from "./admin-navigation";
import { useSeo, useSiteName } from "@/hooks/use-seo";
import { monogramFromSiteName } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FolderKanban,
  Tags,
  Sparkles,
  Zap,
  FileText,
  MessageSquareQuote,
  Inbox,
  Image as ImageIcon,
  UserCog,
  Settings,
  Share2,
  LogOut,
  ArrowLeft,
  Loader2,
  LayoutTemplate,
  Palette,
  Navigation as NavigationIcon,
} from "lucide-react";
import { useRouter } from "@/lib/router";
import { cn } from "@/lib/utils";

type AdminTab =
  | "overview"
  | "homepage"
  | "projects"
  | "categories"
  | "services"
  | "skills"
  | "resume"
  | "testimonials"
  | "inquiries"
  | "appearance"
  | "navigation"
  | "media"
  | "profile"
  | "settings"
  | "social";

const TABS: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; group: string }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard, group: "Content" },
  { id: "homepage", label: "Homepage Builder", icon: LayoutTemplate, group: "Content" },
  { id: "projects", label: "Projects", icon: FolderKanban, group: "Content" },
  { id: "categories", label: "Categories", icon: Tags, group: "Content" },
  { id: "services", label: "Services", icon: Sparkles, group: "Content" },
  { id: "skills", label: "Skills", icon: Zap, group: "Content" },
  { id: "resume", label: "Experience & CV", icon: FileText, group: "Content" },
  { id: "testimonials", label: "Testimonials", icon: MessageSquareQuote, group: "Engagement" },
  { id: "inquiries", label: "Inquiries", icon: Inbox, group: "Engagement" },
  { id: "appearance", label: "Appearance", icon: Palette, group: "Design" },
  { id: "navigation", label: "Navigation", icon: NavigationIcon, group: "Design" },
  { id: "media", label: "Media Library", icon: ImageIcon, group: "System" },
  { id: "profile", label: "Profile", icon: UserCog, group: "System" },
  { id: "settings", label: "Website Settings", icon: Settings, group: "System" },
  { id: "social", label: "Social Links", icon: Share2, group: "System" },
];

export function AdminView() {
  useSeo("Admin — Portfolio CMS", "Content management dashboard.");
  const siteName = useSiteName();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useRouter((s) => s.navigate);
  const qc = useQueryClient();

  const { data: me, isLoading, isError } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: adminApi.me,
    retry: false,
    staleTime: 120_000,
  });

  const logout = async () => {
    try {
      await adminApi.logout();
    } finally {
      qc.clear();
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Checking session" />
      </div>
    );
  }

  if (isError || !me) {
    return <AdminLogin onSuccess={() => qc.invalidateQueries({ queryKey: ["admin"] })} />;
  }

  const groups = [...new Set(TABS.map((t) => t.group))];

  return (
    <div className="flex min-h-[100svh] bg-sidebar">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <p className="font-heading font-semibold">
            {monogramFromSiteName(siteName)}<span className="text-primary">®</span> CMS
          </p>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>
        <nav className="admin-scroll flex-1 overflow-y-auto px-3 py-4" aria-label="Admin sections">
          {groups.map((group) => (
            <div key={group} className="mb-5">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {group}
              </p>
              <ul className="space-y-1">
                {TABS.filter((t) => t.group === group).map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        setTab(t.id);
                        setSidebarOpen(false);
                      }}
                      aria-current={tab === t.id ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors",
                        tab === t.id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <t.icon className="size-4" aria-hidden />
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-3 py-2">
            <p className="text-sm font-medium">{me.name}</p>
            <p className="text-xs text-muted-foreground">{me.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
          <button
            onClick={() => navigate("/")}
            className="mt-1 flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden /> View site
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-sidebar-border bg-sidebar/90 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              ☰
            </Button>
            <h1 className="font-heading text-lg font-semibold">
              {TABS.find((t) => t.id === tab)?.label}
            </h1>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">
            Role: <span className="text-primary">{me.role}</span>
          </span>
        </header>

        <main className="admin-scroll p-5 lg:p-8">
          {tab === "overview" && <AdminOverview onGo={(t) => setTab(t as AdminTab)} />}
          {tab === "homepage" && <AdminHomepage />}
          {tab === "projects" && <AdminProjects />}
          {tab === "categories" && <AdminSimpleCrud resource="categories" />}
          {tab === "services" && <AdminSimpleCrud resource="services" />}
          {tab === "skills" && <AdminSimpleCrud resource="skills" />}
          {tab === "testimonials" && <AdminSimpleCrud resource="testimonials" />}
          {tab === "social" && <AdminSimpleCrud resource="social" />}
          {tab === "resume" && <AdminResume />}
          {tab === "inquiries" && <AdminInquiries />}
          {tab === "appearance" && <AdminTheme />}
          {tab === "navigation" && <AdminNavigation />}
          {tab === "media" && <AdminMedia />}
          {tab === "profile" && <AdminProfileSettings section="profile" />}
          {tab === "settings" && <AdminProfileSettings section="settings" />}
        </main>
      </div>
    </div>
  );
}
