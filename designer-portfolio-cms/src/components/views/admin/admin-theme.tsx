"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { adminApi } from "@/services/api";
import type { ThemeConfig } from "@/lib/cms-types";
import { applyTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Palette, RotateCcw, Save, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { RevisionButton } from "./admin-revisions";
import { describeMutationError } from "./admin-error-details";

const FONT_OPTIONS = ["Space Grotesk", "Inter", "Playfair Display", "system-ui"] as const;

const COLOR_FIELDS = [
  { key: "primaryColor", label: "Primary / accent", hint: "Buttons, links, highlights" },
  { key: "backgroundColor", label: "Background", hint: "Page backdrop" },
  { key: "surfaceColor", label: "Surface", hint: "Panels & popovers" },
  { key: "cardColor", label: "Card", hint: "Cards & inputs" },
  { key: "textColor", label: "Text", hint: "Headings & body copy" },
  { key: "textMutedColor", label: "Muted text", hint: "Captions, secondary copy" },
  { key: "borderColor", label: "Borders", hint: "Lines & dividers" },
] as const;

type ColorKey = (typeof COLOR_FIELDS)[number]["key"];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/* Presets — complete theme snapshots the user can try with one click. */
const PRESETS: { name: string; description: string; theme: Omit<ThemeConfig, "id"> }[] = [
  {
    name: "Dark Luxury",
    description: "Lime accent on near-black — the studio classic",
    theme: {
      mode: "DARK",
      primaryColor: "#C6FF00",
      backgroundColor: "#080808",
      surfaceColor: "#111111",
      cardColor: "#171717",
      textColor: "#FFFFFF",
      textMutedColor: "#A1A1AA",
      borderColor: "#292929",
      headingFont: "Space Grotesk",
      bodyFont: "Inter",
      editorialFont: "Playfair Display",
      baseFontSize: 16,
      fontSizeScale: 1,
      borderRadius: 4,
      buttonStyle: "sharp",
      sectionSpacing: "comfortable",
      cardStyle: "flat",
    },
  },
  {
    name: "Light Studio",
    description: "Soft daylight palette with olive accents",
    theme: {
      mode: "LIGHT",
      primaryColor: "#5E8C00",
      backgroundColor: "#F5F5F2",
      surfaceColor: "#FFFFFF",
      cardColor: "#FFFFFF",
      textColor: "#18181B",
      textMutedColor: "#52525B",
      borderColor: "#E4E4E7",
      headingFont: "Space Grotesk",
      bodyFont: "Inter",
      editorialFont: "Playfair Display",
      baseFontSize: 16,
      fontSizeScale: 1,
      borderRadius: 6,
      buttonStyle: "rounded",
      sectionSpacing: "comfortable",
      cardStyle: "outlined",
    },
  },
];

/** Only the editable, savable fields (used for the PATCH payload + dirty check). */
function themePayload(theme: ThemeConfig) {
  return {
    mode: theme.mode,
    primaryColor: theme.primaryColor,
    backgroundColor: theme.backgroundColor,
    surfaceColor: theme.surfaceColor,
    cardColor: theme.cardColor,
    textColor: theme.textColor,
    textMutedColor: theme.textMutedColor,
    borderColor: theme.borderColor,
    headingFont: theme.headingFont,
    bodyFont: theme.bodyFont,
    editorialFont: theme.editorialFont,
    baseFontSize: theme.baseFontSize,
    fontSizeScale: Number(theme.fontSizeScale),
    borderRadius: theme.borderRadius,
    buttonStyle: theme.buttonStyle,
    sectionSpacing: theme.sectionSpacing,
    cardStyle: theme.cardStyle,
  };
}

export function AdminTheme() {
  const qc = useQueryClient();
  const serverRef = useRef<ThemeConfig | null>(null);
  const [serverTheme, setServerTheme] = useState<ThemeConfig | null>(null);
  const [draft, setDraft] = useState<ThemeConfig | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "theme"],
    queryFn: adminApi.theme,
  });

  // Seed the draft from the server whenever fresh server data arrives
  // (initial load, after save, after restore). TanStack structural sharing
  // keeps the same reference for unchanged data, so in-progress edits are
  // never clobbered by refetches that return the same values.
  if (data && serverTheme !== data) {
    setServerTheme(data);
    setDraft({ ...data });
  }

  // Keep the ref in sync (used by the unmount cleanup below).
  useEffect(() => {
    serverRef.current = serverTheme;
  }, [serverTheme]);

  // Live preview: the admin chrome itself reflects every change instantly.
  useEffect(() => {
    if (draft) applyTheme(draft);
  }, [draft]);

  // Leaving the editor restores the currently saved theme.
  useEffect(
    () => () => {
      if (serverRef.current) applyTheme(serverRef.current);
    },
    []
  );

  const saveMutation = useMutation({
    mutationFn: async (theme: ThemeConfig) => {
      const payload = themePayload(theme);
      try {
        return await adminApi.updateTheme(payload);
      } catch (e) {
        throw new Error(
          await describeMutationError(e, "/api/v1/admin/theme", {
            method: "PATCH",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "theme"] });
      qc.invalidateQueries({ queryKey: ["theme"] });
      toast.success("Theme saved — live on the whole site");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="h-96 animate-pulse rounded-sm bg-elevated" aria-busy />;
  }

  const set = <K extends keyof ThemeConfig>(field: K, value: ThemeConfig[K]) =>
    setDraft((d) => (d ? { ...d, [field]: value } : d));

  const revert = async () => {
    const result = await refetch();
    const server = result.data;
    if (server) {
      setServerTheme(server); // explicit reset — structural sharing may keep the old ref
      setDraft({ ...server });
      applyTheme(server);
      toast.info("Reverted to the saved theme");
    }
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setDraft((d) => ({
      ...(d ?? data),
      ...preset.theme,
    }));
    toast.info(`${preset.name} applied — press Save to keep it`);
  };

  const scale = Number(draft?.fontSizeScale ?? 1);
  const dirty = !!draft && JSON.stringify(themePayload(draft)) !== JSON.stringify(themePayload(data));

  const invalidColor = (key: ColorKey) => !!draft && !HEX_RE.test(draft[key]);

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            Changes preview instantly on this page — nothing goes live until you press{" "}
            <span className="font-medium text-foreground">Save</span>.
          </p>
          {dirty && (
            <p className="mt-1 text-xs font-medium text-primary" role="status">
              Unsaved changes
            </p>
          )}
        </div>
        <RevisionButton
          contentLabel="cms.themeconfig"
          objectId="theme"
          invalidateKeys={[["admin", "theme"], ["theme"]]}
        />
        <Button variant="outline" onClick={revert} className="gap-1.5 border-sidebar-border">
          <RotateCcw className="size-3.5" aria-hidden /> Revert
        </Button>
        <Button
          onClick={() => draft && saveMutation.mutate(draft)}
          disabled={saveMutation.isPending || !draft}
          className="gap-1.5 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {saveMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Save theme
        </Button>
      </div>

      {/* Presets */}
      <section aria-label="Presets" className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Presets
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="flex items-center gap-3 rounded-sm border border-sidebar-border bg-elevated p-4 text-left transition-colors hover:border-primary/50"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border"
                style={{ backgroundColor: p.theme.backgroundColor, borderColor: p.theme.borderColor }}
                aria-hidden
              >
                <span
                  className="size-4 rounded-full"
                  style={{ backgroundColor: p.theme.primaryColor }}
                />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Palette className="size-3.5 text-muted-foreground" aria-hidden />
                  {p.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {p.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {draft && (
        <>
          {/* Colours */}
          <section aria-label="Colours" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Colours
            </p>
            <div className="grid gap-4 rounded-sm border border-sidebar-border bg-elevated p-5 sm:grid-cols-2">
              {COLOR_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {f.label}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={HEX_RE.test(draft[f.key]) ? draft[f.key] : "#000000"}
                      onChange={(e) => set(f.key, e.target.value.toUpperCase())}
                      className="h-10 w-12 shrink-0 cursor-pointer border border-sidebar-border bg-background"
                      aria-label={`${f.label} colour picker`}
                    />
                    <Input
                      value={draft[f.key]}
                      onChange={(e) => set(f.key, e.target.value.toUpperCase())}
                      placeholder="#C6FF00"
                      className={cn(
                        "w-32 border-sidebar-border bg-background font-mono text-sm",
                        invalidColor(f.key) && "border-destructive"
                      )}
                      aria-label={`${f.label} hex value`}
                      aria-invalid={invalidColor(f.key)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{f.hint}</p>
                </div>
              ))}
            </div>
            {COLOR_FIELDS.some((f) => invalidColor(f.key)) && (
              <p className="text-xs text-destructive">
                Colours must be 6-digit hex values (e.g. #C6FF00) before saving.
              </p>
            )}
          </section>

          {/* Mode & typography */}
          <section aria-label="Mode and typography" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Mode &amp; typography
            </p>
            <div className="grid gap-4 rounded-sm border border-sidebar-border bg-elevated p-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Mode
                </Label>
                <Select value={draft.mode} onValueChange={(v) => set("mode", v)}>
                  <SelectTrigger className="border-sidebar-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-sidebar-border bg-elevated">
                    <SelectItem value="DARK">Dark</SelectItem>
                    <SelectItem value="LIGHT">Light</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Base palette mood of the site.</p>
              </div>
              {(
                [
                  { key: "headingFont" as const, label: "Heading font" },
                  { key: "bodyFont" as const, label: "Body font" },
                  { key: "editorialFont" as const, label: "Editorial font" },
                ]
              ).map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {f.label}
                  </Label>
                  <Select value={draft[f.key]} onValueChange={(v) => set(f.key, v)}>
                    <SelectTrigger className="border-sidebar-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-sidebar-border bg-elevated">
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Fonts are limited to the families loaded by the site: Space Grotesk, Inter,
                Playfair Display and system-ui. Other families would silently fall back.
              </p>
            </div>
          </section>

          {/* Sizing & shape */}
          <section aria-label="Sizing and shape" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Sizing &amp; shape
            </p>
            <div className="grid gap-6 rounded-sm border border-sidebar-border bg-elevated p-5 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Base font size
                  </Label>
                  <Input
                    type="number"
                    min={12}
                    max={24}
                    value={draft.baseFontSize}
                    onChange={(e) =>
                      set("baseFontSize", Math.min(24, Math.max(12, Number(e.target.value) || 16)))
                    }
                    className="h-8 w-20 border-sidebar-border bg-background text-sm"
                    aria-label="Base font size in pixels"
                  />
                </div>
                <Slider
                  min={12}
                  max={24}
                  step={1}
                  value={[draft.baseFontSize]}
                  onValueChange={([v]) => set("baseFontSize", v)}
                  aria-label="Base font size slider"
                />
                <p className="text-xs text-muted-foreground">{draft.baseFontSize}px root size.</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Font scale
                  </Label>
                  <span className="font-mono text-sm">{scale.toFixed(2)}×</span>
                </div>
                <Slider
                  min={0.8}
                  max={1.4}
                  step={0.05}
                  value={[scale]}
                  onValueChange={([v]) => set("fontSizeScale", v)}
                  aria-label="Font scale slider"
                />
                <p className="text-xs text-muted-foreground">
                  Scales every heading — 1.00 is the designed default.
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Corner radius
                  </Label>
                  <span className="font-mono text-sm">{draft.borderRadius}px</span>
                </div>
                <Slider
                  min={0}
                  max={24}
                  step={1}
                  value={[draft.borderRadius]}
                  onValueChange={([v]) => set("borderRadius", v)}
                  aria-label="Corner radius slider"
                />
                <p className="text-xs text-muted-foreground">
                  0 = sharp editorial corners, 24 = soft and friendly.
                </p>
              </div>
            </div>
          </section>

          {/* Styles */}
          <section aria-label="Component styles" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Component styles
            </p>
            <div className="grid gap-4 rounded-sm border border-sidebar-border bg-elevated p-5 sm:grid-cols-3">
              {(
                [
                  { key: "buttonStyle" as const, label: "Buttons", options: ["sharp", "rounded", "pill"] },
                  {
                    key: "sectionSpacing" as const,
                    label: "Section spacing",
                    options: ["compact", "comfortable", "spacious"],
                  },
                  { key: "cardStyle" as const, label: "Cards", options: ["flat", "glass", "outlined"] },
                ]
              ).map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {f.label}
                  </Label>
                  <Select value={draft[f.key]} onValueChange={(v) => set(f.key, v)}>
                    <SelectTrigger className="border-sidebar-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-sidebar-border bg-elevated">
                      {f.options.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </section>

          <p className="flex items-start gap-2 rounded-sm border border-sidebar-border bg-elevated p-4 text-xs leading-relaxed text-muted-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            Tip: the page behind this editor is styled with your draft so you can judge contrast and
            spacing. Use “Revert” to discard experiments, and remember to press Save.
          </p>
        </>
      )}
    </div>
  );
}
