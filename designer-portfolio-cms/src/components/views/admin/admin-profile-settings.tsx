"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { RevisionButton } from "./admin-revisions";

export function AdminProfileSettings({ section }: { section: "profile" | "settings" }) {
  const qc = useQueryClient();
  const isProfile = section === "profile";

  const { data, isLoading } = useQuery({
    queryKey: ["admin", section],
    queryFn: async () => (isProfile ? await adminApi.profile() : await adminApi.settings()),
  });

  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
  const [seeded, setSeeded] = useState(false);

  // Seed the form once data arrives — adjust-state-during-render pattern
  if (data && !seeded) {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = data as unknown as Record<string, unknown>;
    const clean: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(rest)) {
      clean[k] =
        typeof v === "string"
          ? v
          : typeof v === "number"
            ? v
            : typeof v === "boolean"
              ? v
              : "";
    }
    setForm(clean);
    setSeeded(true);
  }

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (isProfile) return adminApi.updateProfile(payload);
      return adminApi.updateSettings(payload);
    },
    onSuccess: () => {
      toast.success(isProfile ? "Profile saved" : "Settings saved");
      qc.invalidateQueries({ queryKey: ["admin", section] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["homepage"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="h-96 animate-pulse rounded-sm bg-elevated" aria-busy />;
  }

  const set = (k: string, v: string | number | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const submit = () => {
    const required = isProfile ? ["name", "title", "shortBio", "bio"] : ["siteName"];
    const missing = required.find((k) => !String(form[k] ?? "").trim());
    if (missing) {
      toast.error(`"${missing}" is required`);
      return;
    }
    mutation.mutate(form);
  };

  const textFields: { key: string; label: string; textarea?: boolean; type?: string }[] = isProfile
    ? [
        { key: "name", label: "Designer name" },
        { key: "title", label: "Professional title" },
        { key: "tagline", label: "Tagline" },
        { key: "email", label: "Public email" },
        { key: "phone", label: "Phone" },
        { key: "location", label: "Location" },
        { key: "photoUrl", label: "Portrait URL (from media library)" },
        { key: "shortBio", label: "Short bio (hero paragraph)", textarea: true },
        { key: "bio", label: "Full biography (one paragraph per line)", textarea: true },
        { key: "philosophyTitle", label: "Philosophy heading" },
        { key: "philosophy", label: "Creative philosophy quote", textarea: true },
        { key: "interests", label: "Personal interests", textarea: true },
        { key: "availabilityNote", label: "Availability note" },
        { key: "resumeUrl", label: "CV / resume URL (PDF)" },
      ]
    : [
        { key: "siteName", label: "Site name" },
        { key: "logoText", label: "Logo wordmark" },
        { key: "logoUrl", label: "Logo URL" },
        { key: "tagline", label: "Tagline" },
        { key: "metaTitle", label: "SEO title" },
        { key: "metaDescription", label: "SEO description", textarea: true },
        { key: "metaKeywords", label: "SEO keywords (comma separated)" },
        { key: "ogImageUrl", label: "OG image URL" },
        { key: "faviconUrl", label: "Favicon URL" },
        { key: "contactEmail", label: "Contact email" },
        { key: "whatsappUrl", label: "WhatsApp link" },
        { key: "footerText", label: "Footer text", textarea: true },
        { key: "copyrightText", label: "Copyright line" },
        { key: "cvUrl", label: "CV download URL (PDF)" },
        { key: "accentColor", label: "Accent colour (hex)" },
      ];

  const selectFields = isProfile
    ? [
        {
          key: "availabilityStatus",
          label: "Availability status",
          options: ["AVAILABLE", "LIMITED", "UNAVAILABLE"],
        },
      ]
    : [];

  const numberFields = isProfile
    ? [
        { key: "yearsExperience", label: "Years experience" },
        { key: "clientCount", label: "Client count" },
        { key: "projectCount", label: "Project count" },
        { key: "awardsCount", label: "Awards count" },
      ]
    : [];

  const motionToggles = [
    { key: "hero3dEnabled", label: "Hero 3D scene", hint: "The interactive 3D centerpiece on the homepage." },
    { key: "particlesEnabled", label: "Particles", hint: "Floating particles around the hero area." },
    { key: "parallaxEnabled", label: "Parallax scrolling", hint: "Layers move at different speeds while scrolling." },
    { key: "smoothScrollEnabled", label: "Smooth scrolling", hint: "Gentle eased scrolling instead of instant jumps." },
    { key: "cursorEffectEnabled", label: "Custom cursor effect", hint: "The decorative cursor animation." },
  ];

  const boolVal = (k: string, fallback: boolean) =>
    typeof form[k] === "boolean" ? Boolean(form[k]) : fallback;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {textFields.map((f) => (
          <div
            key={f.key}
            className={`space-y-1.5 ${f.textarea ? "sm:col-span-2" : ""}`}
          >
            <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {f.label}
            </Label>
            {f.textarea ? (
              <Textarea
                value={String(form[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                rows={f.key === "bio" ? 8 : 3}
                className="border-sidebar-border bg-background"
              />
            ) : (
              <Input
                type={f.type ?? "text"}
                value={String(form[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                className="border-sidebar-border bg-background"
              />
            )}
          </div>
        ))}

        {selectFields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {f.label}
            </Label>
            <select
              value={String(form[f.key] ?? "AVAILABLE")}
              onChange={(e) => set(f.key, e.target.value)}
              className="h-10 w-full rounded-sm border border-sidebar-border bg-background px-3 text-sm"
            >
              {f.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        ))}

        {numberFields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {f.label}
            </Label>
            <Input
              type="number"
              value={Number(form[f.key] ?? 0)}
              onChange={(e) => set(f.key, Number(e.target.value))}
              className="border-sidebar-border bg-background"
            />
          </div>
        ))}
      </div>

      {/* Motion & 3D — settings only */}
      {!isProfile && (
        <section
          className="space-y-5 border border-sidebar-border bg-elevated p-5"
          aria-label="Motion and 3D settings"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Motion &amp; 3D
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Turn heavy effects off for a faster, calmer site — changes apply after saving.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {motionToggles.map((f) => (
              <div key={f.key} className="flex items-center gap-3 rounded-sm border border-sidebar-border bg-background p-3">
                <Switch
                  id={`settings-${f.key}`}
                  checked={boolVal(f.key, true)}
                  onCheckedChange={(c) => set(f.key, c)}
                />
                <div className="min-w-0">
                  <Label htmlFor={`settings-${f.key}`} className="text-sm font-medium">
                    {f.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{f.hint}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Animation intensity
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={Number(form.animationIntensity ?? 70)}
                onChange={(e) =>
                  set("animationIntensity", Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                }
                className="h-8 w-20 border-sidebar-border bg-background text-sm"
                aria-label="Animation intensity in percent"
              />
            </div>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[Number(form.animationIntensity ?? 70)]}
              onValueChange={([v]) => set("animationIntensity", v)}
              aria-label="Animation intensity slider"
            />
            <p className="text-xs text-muted-foreground">
              0 disables decorative animation entirely; 100 is full studio flair.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Hero fallback image URL
            </Label>
            <Input
              value={String(form.heroFallbackUrl ?? "")}
              onChange={(e) => set("heroFallbackUrl", e.target.value)}
              className="border-sidebar-border bg-background font-mono text-sm"
              placeholder="/uploads/demo/portrait.png"
            />
            <p className="text-xs text-muted-foreground">
              Shown instead of the 3D scene when it is disabled or the device cannot render it.
              Paste a /uploads/… URL from the Media Library.
            </p>
          </div>
        </section>
      )}

      {isProfile && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Experience, education, certifications, achievements and skills are managed in the
          <span className="text-primary"> Experience &amp; CV </span>and
          <span className="text-primary"> Skills </span>tabs. Social links live under
          <span className="text-primary"> Social Links</span>.
        </p>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-sidebar-border pt-5">
        <RevisionButton
          contentLabel={isProfile ? "cms.profile" : "cms.websitesetting"}
          objectId={data.id}
          invalidateKeys={
            isProfile
              ? [["admin", "profile"], ["profile"]]
              : [["admin", "settings"], ["settings"], ["homepage"]]
          }
        />
        <Button
          onClick={submit}
          disabled={mutation.isPending}
          className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Save changes
        </Button>
      </div>
    </div>
  );
}
