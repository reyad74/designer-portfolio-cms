"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { adminApi } from "@/services/api";
import type { HomepageSection, SectionType } from "@/lib/cms-types";
import type { Project } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "@/lib/router";
import { RevisionButton } from "./admin-revisions";
import { describeMutationError } from "./admin-error-details";

/* ── Section type metadata ──────────────────────────────────────────────── */

const TYPE_LABELS: Record<SectionType, string> = {
  hero: "Hero",
  marquee: "Marquee",
  featured_projects: "Featured Projects",
  about_preview: "About Preview",
  services_preview: "Services Preview",
  skills_preview: "Skills Preview",
  testimonials_preview: "Testimonials Preview",
  experience_preview: "Experience Preview",
  contact_cta: "Contact CTA",
};

const TYPE_HINTS: Record<SectionType, string> = {
  hero: "Opening headline with CTAs and optional stats",
  marquee: "Scrolling strip of words (skills, brands…)",
  featured_projects: "Grid of selected projects",
  about_preview: "Short intro with a link to the About page",
  services_preview: "Preview of your services list",
  skills_preview: "Preview of the skills list",
  testimonials_preview: "Preview of client testimonials",
  experience_preview: "Preview of work experience",
  contact_cta: "Closing call-to-action for the contact page",
};

const SECTION_TYPES = Object.keys(TYPE_LABELS) as SectionType[];

const BACKGROUND_STYLES = [
  { value: "none", label: "None" },
  { value: "gradient", label: "Gradient" },
  { value: "noise", label: "Noise" },
  { value: "grid", label: "Grid" },
] as const;

/* ── Config helpers (config is a free-form JSON object) ─────────────────── */

type SectionConfig = Record<string, unknown>;

const cfgStr = (c: SectionConfig, k: string, fallback = ""): string =>
  typeof c[k] === "string" ? (c[k] as string) : fallback;

const cfgBool = (c: SectionConfig, k: string, fallback = false): boolean =>
  typeof c[k] === "boolean" ? (c[k] as boolean) : fallback;

const cfgNum = (c: SectionConfig, k: string, fallback: number): number =>
  typeof c[k] === "number" && !Number.isNaN(c[k]) ? (c[k] as number) : fallback;

const cfgArr = (c: SectionConfig, k: string): unknown[] =>
  Array.isArray(c[k]) ? (c[k] as unknown[]) : [];

const cfgObj = (c: SectionConfig, k: string): SectionConfig => {
  const v = c[k];
  return v && typeof v === "object" && !Array.isArray(v) ? (v as SectionConfig) : {};
};

interface StatRow {
  value: string;
  label: string;
}

/* ── Main page ──────────────────────────────────────────────────────────── */

export function AdminHomepage() {
  const qc = useQueryClient();
  const navigate = useRouter((s) => s.navigate);
  const [editing, setEditing] = useState<HomepageSection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HomepageSection | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "sections"],
    queryFn: adminApi.sections,
  });

  const sections = data ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "sections"] });
    qc.invalidateQueries({ queryKey: ["homepage"] });
  };

  const createMutation = useMutation({
    mutationFn: (sectionType: SectionType) =>
      adminApi.createSection({ sectionType, status: "DRAFT" }),
    onSuccess: (created) => {
      invalidate();
      toast.success(`${TYPE_LABELS[created.sectionType]} section added as a draft`);
      setEditing(created);
      setDialogOpen(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateSection(id, payload),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteSection(id),
    onSuccess: () => {
      invalidate();
      toast.success("Section deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: (order: number[]) => adminApi.reorderSections(order),
    onSuccess: () => {
      invalidate();
      toast.success("Order saved");
    },
    onError: (e: Error) => {
      toast.error(e.message);
      invalidate(); // revert optimistic order with server truth
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => String(s.id) === String(active.id));
    const newIndex = sections.findIndex((s) => String(s.id) === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(sections, oldIndex, newIndex);
    qc.setQueryData(["admin", "sections"], next); // optimistic
    reorderMutation.mutate(next.map((s) => Number(s.id)));
  };

  const toggleStatus = (section: HomepageSection) => {
    const next = section.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    patchMutation.mutate(
      { id: String(section.id), payload: { status: next } },
      {
        onSuccess: () =>
          toast.success(next === "PUBLISHED" ? "Section published" : "Section moved back to draft"),
      }
    );
  };

  const toggleVisible = (section: HomepageSection) => {
    patchMutation.mutate({
      id: String(section.id),
      payload: { isVisible: !section.isVisible },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            Drag to reorder. A section is <span className="text-primary">live</span> only when it is{" "}
            <span className="font-medium">Published</span> <em>and</em>{" "}
            <span className="font-medium">Visible</span>.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-sidebar-border"
          onClick={() => navigate("/preview/home")}
        >
          <ExternalLink className="size-3.5" aria-hidden /> Preview site
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-1.5 bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              Add section <ChevronDown className="size-3.5" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-sidebar-border bg-elevated">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Choose a section type
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-sidebar-border" />
            {SECTION_TYPES.map((t) => (
              <DropdownMenuItem key={t} onSelect={() => createMutation.mutate(t)}>
                <div className="flex flex-col">
                  <span>{TYPE_LABELS[t]}</span>
                  <span className="text-xs text-muted-foreground">{TYPE_HINTS[t]}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3" aria-busy>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-sm bg-elevated" />
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-sm border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          Could not load sections — please refresh the page.
        </p>
      ) : sections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-sidebar-border p-12 text-center">
          <Layers className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            The homepage is empty — add your first section above.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={sections.map((s) => String(s.id))}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {sections.map((section, i) => (
                <SortableSectionRow
                  key={section.id}
                  section={section}
                  index={i}
                  busy={patchMutation.isPending}
                  onToggleStatus={() => toggleStatus(section)}
                  onToggleVisible={() => toggleVisible(section)}
                  onEdit={() => {
                    setEditing(section);
                    setDialogOpen(true);
                  }}
                  onDelete={() => setDeleteTarget(section)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* Editor dialog */}
      <SectionEditDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        section={editing}
        onSaved={() => {
          setDialogOpen(false);
          setEditing(null);
          invalidate();
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-sidebar-border bg-elevated">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete this section?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                `"${deleteTarget.title || TYPE_LABELS[deleteTarget.sectionType]}" will be removed
                from the homepage builder. Its revision history stays available, but a deleted
                section cannot be brought back automatically.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-sidebar-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive font-semibold text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(String(deleteTarget.id));
                setDeleteTarget(null);
              }}
            >
              Delete section
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Sortable row ───────────────────────────────────────────────────────── */

function SortableSectionRow({
  section,
  index,
  busy,
  onToggleStatus,
  onToggleVisible,
  onEdit,
  onDelete,
}: {
  section: HomepageSection;
  index: number;
  busy: boolean;
  onToggleStatus: () => void;
  onToggleVisible: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: String(section.id),
    });
  const navigate = useRouter((s) => s.navigate);

  const live = section.status === "PUBLISHED" && section.isVisible;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-sm border bg-elevated p-3 transition-colors",
        isDragging ? "z-10 border-primary/60 shadow-lg" : "border-sidebar-border",
        !live && "opacity-80"
      )}
    >
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="touch-none rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`Reorder ${section.title || TYPE_LABELS[section.sectionType]}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>

      <span className="w-6 shrink-0 text-center font-heading text-sm text-muted-foreground">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {TYPE_LABELS[section.sectionType]}
          </span>
          <span className="truncate">{section.title || TYPE_LABELS[section.sectionType]}</span>
          {live && (
            <Badge className="rounded-full bg-primary/15 px-2 py-0 text-[10px] font-semibold text-primary">
              live
            </Badge>
          )}
        </p>
        {section.subtitle && (
          <p className="truncate text-xs text-muted-foreground">{section.subtitle}</p>
        )}
      </div>

      {/* Status quick-toggle: click badge to flip Draft ↔ Published */}
      <button
        type="button"
        onClick={onToggleStatus}
        disabled={busy}
        className="inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`${section.status === "PUBLISHED" ? "Move back to draft" : "Publish"} ${
          section.title || TYPE_LABELS[section.sectionType]
        }`}
        title="Click to switch Draft / Published"
      >
        <Badge
          className={cn(
            "rounded-full",
            section.status === "PUBLISHED"
              ? "bg-primary/15 text-primary hover:bg-primary/25"
              : "bg-muted text-muted-foreground hover:bg-muted"
          )}
        >
          {section.status === "PUBLISHED" ? "Published" : "Draft"}
        </Badge>
      </button>

      <button
        type="button"
        onClick={onToggleVisible}
        disabled={busy}
        className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`${section.isVisible ? "Hide" : "Show"} ${
          section.title || TYPE_LABELS[section.sectionType]
        }`}
        title={section.isVisible ? "Visible on site — click to hide" : "Hidden — click to show"}
      >
        {section.isVisible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
      </button>

      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit section">
          <Pencil className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigate("/preview/home")}
          aria-label="Preview homepage"
          title="Preview the homepage draft + published sections"
        >
          <ExternalLink className="size-4" />
        </Button>
        <RevisionButton
          contentLabel="cms.homepagesection"
          objectId={String(section.id)}
          label=""
          invalidateKeys={[["admin", "sections"], ["homepage"]]}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          aria-label="Delete section"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

/* ── Editor dialog ──────────────────────────────────────────────────────── */

interface EditState {
  title: string;
  subtitle: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  isVisible: boolean;
  backgroundStyle: "none" | "gradient" | "noise" | "grid";
  backgroundUrl: string;
  config: SectionConfig;
}

function toEditState(section: HomepageSection): EditState {
  return {
    title: section.title ?? "",
    subtitle: section.subtitle ?? "",
    description: section.description ?? "",
    status: section.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    isVisible: Boolean(section.isVisible),
    backgroundStyle: section.backgroundStyle ?? "none",
    backgroundUrl: section.backgroundUrl ?? "",
    config: { ...(section.config ?? {}) },
  };
}

function SectionEditDialog({
  open,
  onOpenChange,
  section,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  section: HomepageSection | null;
  onSaved: () => void;
}) {
  const isEdit = !!section;
  const [form, setForm] = useState<EditState | null>(section ? toEditState(section) : null);
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  // Re-seed whenever a different section is opened
  const seedKey = `${section?.id ?? "new"}-${open}`;
  if (open && seedKey !== key) {
    setKey(seedKey);
    setForm(section ? toEditState(section) : null);
  }

  const set = <K extends keyof EditState>(field: K, value: EditState[K]) =>
    setForm((f) => (f ? { ...f, [field]: value } : f));

  const setConfig = (patch: SectionConfig) =>
    setForm((f) => (f ? { ...f, config: { ...f.config, ...patch } } : f));

  const save = async () => {
    if (!form || !section) return;
    setSaving(true);
    const payload = {
      title: form.title,
      subtitle: form.subtitle,
      description: form.description,
      status: form.status,
      isVisible: form.isVisible,
      backgroundStyle: form.backgroundStyle,
      backgroundUrl: form.backgroundUrl,
      config: form.config,
    };
    try {
      await adminApi.updateSection(String(section.id), payload);
      toast.success("Section saved");
      onSaved();
    } catch (e) {
      const message = await describeMutationError(
        e,
        `/api/v1/admin/sections/${section.id}`,
        { method: "PATCH", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } }
      );
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-scroll max-h-[92vh] max-w-3xl overflow-y-auto border-sidebar-border bg-elevated">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Edit {section ? TYPE_LABELS[section.sectionType] : "section"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Common settings apply to every section type; the block below configures this specific
            type.
          </DialogDescription>
        </DialogHeader>

        {form && section && (
          <div className="space-y-6">
            {/* Common fields */}
            <section className="space-y-4" aria-label="Common settings">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title (heading)">
                  <Input
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    className="border-sidebar-border bg-background"
                    placeholder={TYPE_LABELS[section.sectionType]}
                  />
                </Field>
                <Field label="Subtitle">
                  <Input
                    value={form.subtitle}
                    onChange={(e) => set("subtitle", e.target.value)}
                    className="border-sidebar-border bg-background"
                  />
                </Field>
                <Field label="Description" className="sm:col-span-2">
                  <Textarea
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    rows={2}
                    className="border-sidebar-border bg-background"
                  />
                </Field>
                <Field label="Background style">
                  <Select
                    value={form.backgroundStyle}
                    onValueChange={(v) => set("backgroundStyle", v as EditState["backgroundStyle"])}
                  >
                    <SelectTrigger className="border-sidebar-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-sidebar-border bg-elevated">
                      {BACKGROUND_STYLES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Background image URL">
                  <Input
                    value={form.backgroundUrl}
                    onChange={(e) => set("backgroundUrl", e.target.value)}
                    className="border-sidebar-border bg-background font-mono text-sm"
                    placeholder="/uploads/demo/og-image.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a /uploads/… URL from the Media Library.
                  </p>
                </Field>
              </div>

              <div className="flex flex-col gap-3 rounded-sm border border-sidebar-border bg-background p-4 sm:flex-row sm:gap-8">
                <div className="flex items-center gap-3">
                  <Switch
                    id="section-status"
                    checked={form.status === "PUBLISHED"}
                    onCheckedChange={(c) => set("status", c ? "PUBLISHED" : "DRAFT")}
                  />
                  <div>
                    <Label htmlFor="section-status" className="text-sm font-medium">
                      Published
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {form.status === "PUBLISHED"
                        ? "Live on the public site (when visible)."
                        : "Draft — only you can see it in the preview."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="section-visible"
                    checked={form.isVisible}
                    onCheckedChange={(c) => set("isVisible", c)}
                  />
                  <div>
                    <Label htmlFor="section-visible" className="text-sm font-medium">
                      Visible
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {form.isVisible
                        ? "Shown on the site (when published)."
                        : "Hidden from the site."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Per-type config */}
            <section className="space-y-4" aria-label="Type-specific settings">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {TYPE_LABELS[section.sectionType]} settings
              </p>
              <div className="rounded-sm border border-sidebar-border bg-background p-4">
                <ConfigEditor type={section.sectionType} config={form.config} onChange={setConfig} />
              </div>
            </section>

            <div className="flex items-center justify-end gap-3 border-t border-sidebar-border pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-sidebar-border">
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={saving}
                className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Per-type config editors ────────────────────────────────────────────── */

function ConfigEditor({
  type,
  config,
  onChange,
}: {
  type: SectionType;
  config: SectionConfig;
  onChange: (patch: SectionConfig) => void;
}) {
  switch (type) {
    case "hero":
      return <HeroConfigEditor config={config} onChange={onChange} />;
    case "marquee":
      return <MarqueeConfigEditor config={config} onChange={onChange} />;
    case "featured_projects":
      return <FeaturedConfigEditor config={config} onChange={onChange} />;
    case "about_preview":
      return <AboutConfigEditor config={config} onChange={onChange} />;
    case "services_preview":
    case "skills_preview":
    case "testimonials_preview":
    case "experience_preview":
      return <LimitConfigEditor config={config} onChange={onChange} />;
    case "contact_cta":
      return <ContactConfigEditor config={config} onChange={onChange} />;
    default:
      return (
        <p className="text-sm text-muted-foreground">
          This section type has no extra settings.
        </p>
      );
  }
}

function HeroConfigEditor({
  config,
  onChange,
}: {
  config: SectionConfig;
  onChange: (patch: SectionConfig) => void;
}) {
  const lines = [...cfgArr(config, "headlineLines").map(String)];
  while (lines.length < 3) lines.push("");
  const ctaPrimary = cfgObj(config, "ctaPrimary");
  const ctaSecondary = cfgObj(config, "ctaSecondary");
  const stats: StatRow[] = cfgArr(config, "stats").map((s) => {
    const o = (s && typeof s === "object" ? s : {}) as SectionConfig;
    return { value: cfgStr(o, "value"), label: cfgStr(o, "label") };
  });

  const setLine = (i: number, v: string) => {
    const next = [...lines];
    next[i] = v;
    onChange({ headlineLines: next });
  };
  const setCta = (key: "ctaPrimary" | "ctaSecondary", field: "label" | "path", v: string) =>
    onChange({ [key]: { ...cfgObj(config, key), [field]: v } });
  const setStat = (i: number, patch: Partial<StatRow>) =>
    onChange({ stats: stats.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  return (
    <div className="space-y-5">
      <Field label="Headline — line 1 (accent / script line)">
        <Input value={lines[0]} onChange={(e) => setLine(0, e.target.value)} className="border-sidebar-border bg-elevated" />
      </Field>
      <Field label="Headline — line 2 (main line)">
        <Input value={lines[1]} onChange={(e) => setLine(1, e.target.value)} className="border-sidebar-border bg-elevated" />
      </Field>
      <Field label="Headline — line 3 (main line continued)">
        <Input value={lines[2]} onChange={(e) => setLine(2, e.target.value)} className="border-sidebar-border bg-elevated" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Primary button
          </p>
          <Input
            value={cfgStr(ctaPrimary, "label")}
            onChange={(e) => setCta("ctaPrimary", "label", e.target.value)}
            placeholder="Label — e.g. View work"
            className="border-sidebar-border bg-elevated"
            aria-label="Primary button label"
          />
          <Input
            value={cfgStr(ctaPrimary, "path")}
            onChange={(e) => setCta("ctaPrimary", "path", e.target.value)}
            placeholder="Path — e.g. /portfolio"
            className="border-sidebar-border bg-elevated font-mono text-sm"
            aria-label="Primary button path"
          />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Secondary button
          </p>
          <Input
            value={cfgStr(ctaSecondary, "label")}
            onChange={(e) => setCta("ctaSecondary", "label", e.target.value)}
            placeholder="Label — e.g. Get in touch"
            className="border-sidebar-border bg-elevated"
            aria-label="Secondary button label"
          />
          <Input
            value={cfgStr(ctaSecondary, "path")}
            onChange={(e) => setCta("ctaSecondary", "path", e.target.value)}
            placeholder="Path — e.g. /contact"
            className="border-sidebar-border bg-elevated font-mono text-sm"
            aria-label="Secondary button path"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="hero-show-stats"
          checked={cfgBool(config, "showStats", true)}
          onCheckedChange={(c) => onChange({ showStats: c })}
        />
        <Label htmlFor="hero-show-stats" className="text-sm">
          Show stats row (years, clients, projects…)
        </Label>
      </div>

      {cfgBool(config, "showStats", true) && (
        <Field label={`Stats (${stats.length})`}>
          <div className="space-y-2">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={s.value}
                  onChange={(e) => setStat(i, { value: e.target.value })}
                  placeholder="Value — e.g. 8+"
                  className="w-32 border-sidebar-border bg-elevated"
                  aria-label={`Stat ${i + 1} value`}
                />
                <Input
                  value={s.label}
                  onChange={(e) => setStat(i, { label: e.target.value })}
                  placeholder="Label — e.g. Years experience"
                  className="flex-1 border-sidebar-border bg-elevated"
                  aria-label={`Stat ${i + 1} label`}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onChange({ stats: stats.filter((_, j) => j !== i) })}
                  aria-label={`Remove stat ${i + 1}`}
                  className="text-destructive"
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="border-sidebar-border"
              onClick={() => onChange({ stats: [...stats, { value: "", label: "" }] })}
            >
              <Plus className="size-3.5" aria-hidden /> Add stat
            </Button>
          </div>
        </Field>
      )}
    </div>
  );
}

function MarqueeConfigEditor({
  config,
  onChange,
}: {
  config: SectionConfig;
  onChange: (patch: SectionConfig) => void;
}) {
  const words = cfgArr(config, "words").map(String);
  return (
    <Field label="Words (comma separated)">
      <Input
        value={words.join(", ")}
        onChange={(e) =>
          onChange({
            words: e.target.value.split(",").map((w) => w.trim()).filter(Boolean),
          })
        }
        placeholder="Branding, Packaging, Art direction, Editorial"
        className="border-sidebar-border bg-elevated"
      />
      <p className="text-xs text-muted-foreground">Shown as a scrolling strip on the homepage.</p>
    </Field>
  );
}

function FeaturedConfigEditor({
  config,
  onChange,
}: {
  config: SectionConfig;
  onChange: (patch: SectionConfig) => void;
}) {
  const limit = Math.min(12, Math.max(1, cfgNum(config, "limit", 6)));
  const mode = cfgStr(config, "mode", "auto") === "manual" ? "manual" : "auto";
  const projectIds = cfgArr(config, "projectIds").map((v) => Number(v));

  const { data } = useQuery({
    queryKey: ["admin", "projects", "picker"],
    queryFn: () => adminApi.projects({ limit: 100 }),
  });
  const projects: Project[] = data?.data ?? [];

  const toggleProject = (id: number) => {
    if (projectIds.includes(id)) {
      onChange({ projectIds: projectIds.filter((p) => p !== id) });
    } else {
      onChange({ projectIds: [...projectIds, id] }); // checked order = display order
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Max projects shown (1–12)">
          <Input
            type="number"
            min={1}
            max={12}
            value={limit}
            onChange={(e) =>
              onChange({ limit: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })
            }
            className="border-sidebar-border bg-elevated"
          />
        </Field>
        <Field label="Project selection">
          <Select value={mode} onValueChange={(v) => onChange({ mode: v })}>
            <SelectTrigger className="border-sidebar-border bg-elevated">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-sidebar-border bg-elevated">
              <SelectItem value="auto">Auto — newest featured projects</SelectItem>
              <SelectItem value="manual">Manual — I pick them myself</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {mode === "manual" && (
        <Field label={`Pick projects (${projectIds.length} selected — display follows check order)`}>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <>
              {projectIds.length > 0 && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Order: {projectIds
                    .map((id) => projects.find((p) => Number(p.id) === id)?.title ?? `#${id}`)
                    .join(" → ")}
                </p>
              )}
              <div className="admin-scroll max-h-64 space-y-1.5 overflow-y-auto rounded-sm border border-sidebar-border bg-elevated p-2">
                {projects.map((p) => {
                  const id = Number(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-3 rounded-sm p-2 text-sm transition-colors hover:bg-sidebar-accent/40"
                    >
                      <Checkbox
                        checked={projectIds.includes(id)}
                        onCheckedChange={() => toggleProject(id)}
                        aria-label={`Include ${p.title}`}
                      />
                      <span className="min-w-0 flex-1 truncate">{p.title}</span>
                      <Badge
                        className={cn(
                          "rounded-full text-[10px]",
                          p.status === "PUBLISHED"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {p.status}
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </Field>
      )}
    </div>
  );
}

function AboutConfigEditor({
  config,
  onChange,
}: {
  config: SectionConfig;
  onChange: (patch: SectionConfig) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Button label">
          <Input
            value={cfgStr(config, "ctaLabel")}
            onChange={(e) => onChange({ ctaLabel: e.target.value })}
            placeholder="More about me"
            className="border-sidebar-border bg-elevated"
          />
        </Field>
        <Field label="Button path">
          <Input
            value={cfgStr(config, "ctaPath")}
            onChange={(e) => onChange({ ctaPath: e.target.value })}
            placeholder="/about"
            className="border-sidebar-border bg-elevated font-mono text-sm"
          />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="about-show-stats"
          checked={cfgBool(config, "showStats", true)}
          onCheckedChange={(c) => onChange({ showStats: c })}
        />
        <Label htmlFor="about-show-stats" className="text-sm">
          Show stats row
        </Label>
      </div>
    </div>
  );
}

function LimitConfigEditor({
  config,
  onChange,
}: {
  config: SectionConfig;
  onChange: (patch: SectionConfig) => void;
}) {
  const limit = Math.max(1, cfgNum(config, "limit", 4));
  return (
    <Field label="How many items to show">
      <Input
        type="number"
        min={1}
        value={limit}
        onChange={(e) => onChange({ limit: Math.max(1, Number(e.target.value) || 1) })}
        className="border-sidebar-border bg-elevated sm:w-40"
      />
      <p className="text-xs text-muted-foreground">
        The preview pulls the highest-priority items automatically.
      </p>
    </Field>
  );
}

function ContactConfigEditor({
  config,
  onChange,
}: {
  config: SectionConfig;
  onChange: (patch: SectionConfig) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Headline">
        <Input
          value={cfgStr(config, "headline")}
          onChange={(e) => onChange({ headline: e.target.value })}
          className="border-sidebar-border bg-elevated"
        />
      </Field>
      <Field label="Sub-line">
        <Input
          value={cfgStr(config, "sub")}
          onChange={(e) => onChange({ sub: e.target.value })}
          className="border-sidebar-border bg-elevated"
        />
      </Field>
      <Field label="Button label">
        <Input
          value={cfgStr(config, "ctaLabel")}
          onChange={(e) => onChange({ ctaLabel: e.target.value })}
          placeholder="Start a project"
          className="border-sidebar-border bg-elevated"
        />
      </Field>
      <Field label="Button path">
        <Input
          value={cfgStr(config, "ctaPath")}
          onChange={(e) => onChange({ ctaPath: e.target.value })}
          placeholder="/contact"
          className="border-sidebar-border bg-elevated font-mono text-sm"
        />
      </Field>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
