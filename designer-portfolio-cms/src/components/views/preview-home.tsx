"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi, ApiError } from "@/services/api";
import { useRouter } from "@/lib/router";
import { SectionRenderer } from "@/components/sections/section-renderer";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone, Tablet, ArrowLeft, Lock } from "lucide-react";
import type { ReactNode } from "react";

/* ── Device preview primitives (shared with the project preview view) ───── */

export type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_OPTIONS: { id: PreviewDevice; label: string; width: string; Icon: typeof Monitor }[] = [
  { id: "desktop", label: "Desktop · 100%", width: "100%", Icon: Monitor },
  { id: "tablet", label: "Tablet · 834px", width: "834px", Icon: Tablet },
  { id: "mobile", label: "Mobile · 390px", width: "390px", Icon: Smartphone },
];

export function PreviewToolbar({
  title,
  device,
  onDevice,
}: {
  title: string;
  device: PreviewDevice;
  onDevice: (device: PreviewDevice) => void;
}) {
  const navigate = useRouter((s) => s.navigate);
  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => navigate("/admin")}
            aria-label="Back to admin"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </button>
          <span className="hidden shrink-0 rounded-sm bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground sm:inline">
            Draft preview
          </span>
          <p className="truncate font-heading text-sm font-semibold">{title}</p>
        </div>
        <div
          role="group"
          aria-label="Preview device size"
          className="flex shrink-0 items-center gap-1 rounded-sm border border-border bg-elevated p-1"
        >
          {DEVICE_OPTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onDevice(id)}
              aria-pressed={device === id}
              className={cn(
                "inline-flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-medium transition-colors",
                device === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminAccessPanel() {
  const navigate = useRouter((s) => s.navigate);
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-border bg-elevated">
        <Lock className="size-6 text-primary" aria-hidden />
      </span>
      <h1 className="mt-6 font-heading text-2xl sm:text-3xl font-bold">Admin access required</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Draft previews are only visible to authenticated admins. Sign in to review unpublished
        content.
      </p>
      <button
        onClick={() => navigate("/admin")}
        className="mt-8 inline-flex items-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-95"
      >
        <ArrowLeft className="size-4" aria-hidden /> Go to admin login
      </button>
    </div>
  );
}

export function PreviewLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
      <div
        className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
        role="status"
        aria-label={label}
      />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function PreviewFrame({ device, children }: { device: PreviewDevice; children: ReactNode }) {
  const width = DEVICE_OPTIONS.find((d) => d.id === device)?.width ?? "100%";
  return (
    <div className="preview-frame mx-auto w-full" style={{ width, maxWidth: "100%" }}>
      <div className="theme-card overflow-hidden rounded-md shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
        <div className="preview-scroll h-[calc(100svh-10rem)] overflow-y-auto bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}

/** True when a failed query is an auth problem (401/403). */
export function isAuthError(error: unknown): boolean {
  const status = error instanceof ApiError ? error.status : undefined;
  return status === 401 || status === 403;
}

/* ── Homepage draft preview ─────────────────────────────────────────────── */

export function PreviewHomeView() {
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const { data, isLoading, error } = useQuery({
    queryKey: ["preview-homepage"],
    queryFn: adminApi.previewHomepage,
    retry: false,
  });

  return (
    <div className="flex min-h-[100svh] flex-col bg-surface">
      <PreviewToolbar title="Homepage sections" device={device} onDevice={setDevice} />
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-8">
        {isAuthError(error) ? (
          <AdminAccessPanel />
        ) : isLoading ? (
          <PreviewLoading label="Loading homepage draft…" />
        ) : data && data.length ? (
          <PreviewFrame device={device}>
            <SectionRenderer sections={data} preview />
          </PreviewFrame>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
            <p className="font-heading text-xl font-semibold">Nothing to preview yet</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Create homepage sections in the admin panel and they will show up here, including
              drafts and unpublished projects.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
