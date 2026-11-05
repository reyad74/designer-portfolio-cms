"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/services/api";
import { Reveal } from "@/components/animations";
import {
  FolderKanban,
  Send,
  Inbox,
  Star,
  Image as ImageIcon,
  LayoutTemplate,
  MessageSquareQuote,
  TrendingUp,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminOverview({ onGo }: { onGo: (tab: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: adminApi.dashboard,
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-sm bg-elevated" />
        ))}
      </div>
    );
  }

  const stats = [
    { label: "Total Projects", value: data.totalProjects, icon: FolderKanban, tab: "projects" },
    { label: "Published", value: data.publishedProjects, icon: Send, tab: "projects" },
    { label: "Drafts", value: data.draftProjects, icon: Clock, tab: "projects" },
    { label: "Featured", value: data.featuredProjects, icon: Star, tab: "projects" },
    { label: "Inquiries", value: data.totalInquiries, icon: Inbox, tab: "inquiries" },
    { label: "Unread Inquiries", value: data.unreadInquiries, icon: TrendingUp, tab: "inquiries", accent: data.unreadInquiries > 0 },
    { label: "Published Reviews", value: data.publishedTestimonials, icon: MessageSquareQuote, tab: "testimonials" },
    { label: "Homepage Sections", value: data.homepageSections ?? 0, icon: LayoutTemplate, tab: "homepage" },
    { label: "Media Assets", value: data.mediaCount, icon: ImageIcon, tab: "media" },
  ];

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.04}>
            <button
              onClick={() => onGo(s.tab)}
              className={cn(
                "w-full border bg-elevated p-5 text-left transition-colors hover:border-primary/50",
                s.accent && s.value > 0 ? "border-primary/60" : "border-sidebar-border"
              )}
            >
              <div className="flex items-center justify-between">
                <s.icon className={cn("size-5", s.accent && s.value > 0 ? "text-primary" : "text-muted-foreground")} aria-hidden />
                {s.accent && s.value > 0 && (
                  <span className="size-2 animate-pulse rounded-full bg-primary" aria-label="Needs attention" />
                )}
              </div>
              <p className="mt-4 font-heading text-4xl font-bold">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">{s.label}</p>
            </button>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent inquiries */}
        <div className="border border-sidebar-border bg-elevated">
          <div className="flex items-center justify-between border-b border-sidebar-border p-5">
            <h2 className="font-heading font-semibold">Recent inquiries</h2>
            <button onClick={() => onGo("inquiries")} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowUpRight className="size-3" aria-hidden />
            </button>
          </div>
          <ul className="divide-y divide-sidebar-border">
            {data.recentInquiries.length === 0 && (
              <li className="p-5 text-sm text-muted-foreground">No inquiries yet.</li>
            )}
            {data.recentInquiries.map((inq) => (
              <li key={inq.id} className="flex items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {inq.fullName}
                    <span className="ml-2 text-xs text-muted-foreground">{inq.email}</span>
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{inq.message}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                    inq.status === "UNREAD" && "bg-primary text-primary-foreground",
                    inq.status === "READ" && "bg-muted text-muted-foreground",
                    inq.status === "ARCHIVED" && "bg-muted/50 text-muted-foreground"
                  )}
                >
                  {inq.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Top projects */}
        <div className="border border-sidebar-border bg-elevated">
          <div className="flex items-center justify-between border-b border-sidebar-border p-5">
            <h2 className="font-heading font-semibold">Most viewed projects</h2>
            <button onClick={() => onGo("projects")} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Manage <ArrowUpRight className="size-3" aria-hidden />
            </button>
          </div>
          <ul className="divide-y divide-sidebar-border">
            {data.topProjects.length === 0 && (
              <li className="p-5 text-sm text-muted-foreground">No projects yet.</li>
            )}
            {data.topProjects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">/{p.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      p.status === "PUBLISHED" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {p.status}
                  </span>
                  <span className="font-heading text-sm">{p.viewCount}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

