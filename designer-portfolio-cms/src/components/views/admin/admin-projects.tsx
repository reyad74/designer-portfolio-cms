"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/services/api";
import type { Project, ProjectImageItem, MediaAsset } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Archive,
  MoreHorizontal,
  Send,
  Star,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RevisionButton } from "./admin-revisions";

type GalleryItem = Pick<ProjectImageItem, "url" | "alt" | "caption">;

interface ProjectForm {
  title: string;
  slug: string;
  summary: string;
  description: string;
  categoryId: string;
  clientName: string;
  projectDate: string;
  tools: string;
  thumbnailUrl: string;
  coverUrl: string;
  objectives: string;
  challenges: string;
  research: string;
  strategy: string;
  concept: string;
  paletteRows: { name: string; hex: string }[];
  typography: string;
  applications: string;
  outcome: string;
  featured: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishAt: string;
  order: number;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY: ProjectForm = {
  title: "",
  slug: "",
  summary: "",
  description: "",
  categoryId: "",
  clientName: "",
  projectDate: "",
  tools: "",
  thumbnailUrl: "",
  coverUrl: "",
  objectives: "",
  challenges: "",
  research: "",
  strategy: "",
  concept: "",
  paletteRows: [],
  typography: "",
  applications: "",
  outcome: "",
  featured: false,
  status: "DRAFT",
  publishAt: "",
  order: 0,
  seoTitle: "",
  seoDescription: "",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toForm(p: Project): ProjectForm {
  let paletteRows: { name: string; hex: string }[] = [];
  try {
    const parsed = JSON.parse(p.colorPalette ?? "[]");
    if (Array.isArray(parsed)) paletteRows = parsed.slice(0, 8);
  } catch { /* ignore */ }
  return {
    title: p.title,
    slug: p.slug,
    summary: p.summary,
    description: p.description,
    categoryId: p.categoryId,
    clientName: p.clientName ?? "",
    projectDate: p.projectDate ? p.projectDate.slice(0, 10) : "",
    tools: p.tools ?? "",
    thumbnailUrl: p.thumbnailUrl ?? "",
    coverUrl: p.coverUrl ?? "",
    objectives: p.objectives ?? "",
    challenges: p.challenges ?? "",
    research: p.research ?? "",
    strategy: p.strategy ?? "",
    concept: p.concept ?? "",
    paletteRows,
    typography: p.typography ?? "",
    applications: p.applications ?? "",
    outcome: p.outcome ?? "",
    featured: p.featured,
    status: p.status,
    publishAt: p.publishAt ? p.publishAt.slice(0, 16) : "",
    order: p.order,
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
  };
}

export function AdminProjects() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<Project | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "projects", q, statusFilter],
    queryFn: () =>
      adminApi.projects({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(q ? { q } : {}),
      }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "projects"] });
    qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    qc.invalidateQueries({ queryKey: ["featured"] });
    qc.invalidateQueries({ queryKey: ["projects"] });
    qc.invalidateQueries({ queryKey: ["homepage"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteProject(id),
    onSuccess: () => {
      invalidate();
      toast.success("Project deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Full-replace PATCH: fetch the complete record (incl. gallery) first, then
   *  PATCH with only the status changed so nothing else gets lost. */
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectForm["status"] }) => {
      const full = await adminApi.project(id);
      const form = toForm(full);
      const palette = form.paletteRows.filter((r) => r.name && r.hex);
      return adminApi.updateProject(id, {
        ...form,
        paletteRows: undefined,
        colorPalette: JSON.stringify(palette),
        publishAt: full.publishAt ?? null,
        images: (full.images ?? []).map((i) => ({
          url: i.url,
          alt: i.alt ?? "",
          caption: i.caption ?? "",
        })),
        status,
      });
    },
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(
        variables.status === "PUBLISHED"
          ? "Project published"
          : variables.status === "ARCHIVED"
            ? "Project archived — hidden from the public site"
            : "Project moved to drafts"
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const projects = data?.data ?? [];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects…"
          className="h-10 max-w-xs border-sidebar-border bg-elevated"
          aria-label="Search projects"
        />
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-10 w-36 border-sidebar-border bg-elevated" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="DRAFT">Drafts</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="ml-auto bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" aria-hidden /> New project
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="h-72 animate-pulse rounded-sm bg-elevated" aria-busy />
      ) : (
        <div className="overflow-x-auto border border-sidebar-border bg-elevated">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-sidebar-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="p-4 font-medium">Project</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Featured</th>
                <th className="p-4 font-medium">Views</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sidebar-border">
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    No projects yet — create your first one.
                  </td>
                </tr>
              )}
              {projects.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-sidebar-accent/40">
                  <td className="p-4">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">/{p.slug}</p>
                  </td>
                  <td className="p-4 text-muted-foreground">{p.category?.name ?? "—"}</td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          aria-label={`Change status of ${p.title} (currently ${p.status})`}
                        >
                          <Badge
                            className={cn(
                              "cursor-pointer",
                              p.status === "PUBLISHED" && "bg-primary/15 text-primary hover:bg-primary/25",
                              p.status === "ARCHIVED" && "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",
                              p.status === "DRAFT" && "bg-muted text-muted-foreground"
                            )}
                          >
                            {p.status === "PUBLISHED" ? (
                              <Eye className="mr-1 size-3" aria-hidden />
                            ) : p.status === "ARCHIVED" ? (
                              <Archive className="mr-1 size-3" aria-hidden />
                            ) : (
                              <EyeOff className="mr-1 size-3" aria-hidden />
                            )}
                            {p.status}
                          </Badge>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="border-sidebar-border bg-elevated">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                          Set status
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-sidebar-border" />
                        <DropdownMenuItem
                          disabled={p.status === "PUBLISHED" || setStatus.isPending}
                          onSelect={() => setStatus.mutate({ id: p.id, status: "PUBLISHED" })}
                        >
                          <Send className="mr-2 size-3.5" aria-hidden /> Publish
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={p.status === "DRAFT" || setStatus.isPending}
                          onSelect={() => setStatus.mutate({ id: p.id, status: "DRAFT" })}
                        >
                          <EyeOff className="mr-2 size-3.5" aria-hidden /> Unpublish → draft
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={p.status === "ARCHIVED" || setStatus.isPending}
                          onSelect={() => setStatus.mutate({ id: p.id, status: "ARCHIVED" })}
                        >
                          <Archive className="mr-2 size-3.5" aria-hidden /> Archive (hidden)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {p.publishAt && (
                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                        Scheduled: {new Date(p.publishAt).toLocaleString()}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    {p.featured && <Star className="size-4 fill-primary text-primary" aria-label="Featured" />}
                  </td>
                  <td className="p-4 font-heading">{p.viewCount}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(p);
                          setDialogOpen(true);
                        }}
                        aria-label={`Edit ${p.title}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label={`Actions for ${p.title}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-sidebar-border bg-elevated">
                          <DropdownMenuItem
                            disabled={p.status === "PUBLISHED" || setStatus.isPending}
                            onSelect={() => setStatus.mutate({ id: p.id, status: "PUBLISHED" })}
                          >
                            <Send className="mr-2 size-3.5" aria-hidden /> Publish
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={p.status === "DRAFT" || setStatus.isPending}
                            onSelect={() => setStatus.mutate({ id: p.id, status: "DRAFT" })}
                          >
                            <EyeOff className="mr-2 size-3.5" aria-hidden /> Unpublish → draft
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={p.status === "ARCHIVED" || setStatus.isPending}
                            onSelect={() => setStatus.mutate({ id: p.id, status: "ARCHIVED" })}
                          >
                            <Archive className="mr-2 size-3.5" aria-hidden /> Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-sidebar-border" />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => {
                              if (confirm(`Delete "${p.title}" permanently?`)) deleteMutation.mutate(p.id);
                            }}
                          >
                            <Trash2 className="mr-2 size-3.5" aria-hidden /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete "${p.title}" permanently?`)) deleteMutation.mutate(p.id);
                        }}
                        aria-label={`Delete ${p.title}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor dialog */}
      <ProjectDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        project={editing}
        onSaved={() => {
          setDialogOpen(false);
          setEditing(null);
          invalidate();
        }}
      />
    </div>
  );
}

/* ── Project editor dialog ─────────────────────────────────────────────── */

function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project: Project | null;
  onSaved: () => void;
}) {
  const isEdit = !!project;
  const [form, setForm] = useState<ProjectForm>(project ? toForm(project) : EMPTY);
  const [gallery, setGallery] = useState<GalleryItem[]>(
    project ? (project.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? "", caption: i.caption ?? "" })) : []
  );
  const [pickerField, setPickerField] = useState<null | "thumbnailUrl" | "coverUrl" | "gallery">(null);
  const [error, setError] = useState("");
  const [galleryFromServer, setGalleryFromServer] = useState(false);
  const [key, setKey] = useState("");

  // Re-seed the form whenever a different project is opened
  const seedKey = `${project?.id ?? "new"}-${open}`;
  if (open && seedKey !== key) {
    setKey(seedKey);
    setForm(project ? toForm(project) : EMPTY);
    setGallery(
      project ? (project.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? "", caption: i.caption ?? "" })) : []
    );
    setError("");
    setGalleryFromServer(false);
  }

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: adminApi.categories,
    enabled: open,
  });

  const { data: media } = useQuery({
    queryKey: ["admin", "media", "picker"],
    queryFn: () => adminApi.media({ limit: 60 }),
    enabled: open && !!pickerField,
  });

  // The admin LIST endpoint does not include gallery images. When editing,
  // fetch the full record so that saving never wipes the existing gallery.
  const { data: fullProject } = useQuery({
    queryKey: ["admin", "project", project?.id],
    queryFn: () => adminApi.project(project!.id),
    enabled: open && !!project,
  });
  if (fullProject && !galleryFromServer) {
    setGalleryFromServer(true);
    if ((fullProject.images?.length ?? 0) > 0 && gallery.length === 0) {
      setGallery(
        (fullProject.images ?? []).map((i) => ({
          url: i.url,
          alt: i.alt ?? "",
          caption: i.caption ?? "",
        }))
      );
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const palette = form.paletteRows.filter((r) => r.name && r.hex);
      const payload = {
        ...form,
        projectDate: form.projectDate || "",
        publishAt: form.publishAt || null,
        colorPalette: JSON.stringify(palette),
        paletteRows: undefined,
        images: gallery,
      };
      if (isEdit && project) return adminApi.updateProject(project.id, payload);
      return adminApi.createProject(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Project updated" : "Project created");
      onSaved();
    },
    onError: (e: Error) => setError(e.message),
  });

  const set = <K extends keyof ProjectForm>(field: K, value: ProjectForm[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const pickMedia = (asset: MediaAsset) => {
    if (pickerField === "thumbnailUrl") set("thumbnailUrl", asset.url);
    else if (pickerField === "coverUrl") set("coverUrl", asset.url);
    else if (pickerField === "gallery") {
      if (!gallery.some((g) => g.url === asset.url)) {
        setGallery((g) => [...g, { url: asset.url, alt: asset.alt ?? "", caption: "" }]);
      }
    }
    setPickerField(null);
  };

  const moveGallery = (index: number, dir: -1 | 1) => {
    const next = [...gallery];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setGallery(next);
  };

  const submit = () => {
    setError("");
    if (!form.title.trim() || form.title.length < 2) return setError("Title is required (min 2 characters).");
    if (!form.slug.trim()) return setError("Slug is required.");
    if (!form.categoryId) return setError("Please choose a category.");
    if (form.summary.trim().length < 10) return setError("Summary must be at least 10 characters.");
    if (form.description.trim().length < 10) return setError("Description must be at least 10 characters.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      return setError("Slug must be lowercase letters/numbers separated by dashes.");
    }
    saveMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="admin-scroll max-h-[92vh] max-w-4xl overflow-y-auto border-sidebar-border bg-elevated">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-10">
              <DialogTitle className="font-heading text-xl">
                {isEdit ? `Edit project — ${project?.title}` : "New project"}
              </DialogTitle>
              {isEdit && project && (
                <RevisionButton
                  contentLabel="portfolio.project"
                  objectId={project.id}
                  invalidateKeys={[
                    ["admin", "projects"],
                    ["projects"],
                    ["homepage"],
                    ["admin", "dashboard"],
                  ]}
                />
              )}
            </div>
          </DialogHeader>

          {error && (
            <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <Tabs defaultValue="basics">
            <TabsList className="bg-muted">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="story">Case Study</TabsTrigger>
              <TabsTrigger value="visuals">Visuals</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            {/* Basics */}
            <TabsContent value="basics" className="grid gap-4 pt-4 sm:grid-cols-2">
              <Field label="Title *">
                <Input
                  value={form.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      title: v,
                      slug: !isEdit || !f.slug ? slugify(v) : f.slug,
                    }));
                  }}
                  className="border-sidebar-border bg-background"
                />
              </Field>
              <Field label="Slug *">
                <Input
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  className="border-sidebar-border bg-background font-mono text-sm"
                  placeholder="my-project"
                />
              </Field>
              <Field label="Category *">
                <Select value={form.categoryId || undefined} onValueChange={(v) => set("categoryId", v)}>
                  <SelectTrigger className="border-sidebar-border bg-background">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Client name">
                <Input
                  value={form.clientName}
                  onChange={(e) => set("clientName", e.target.value)}
                  className="border-sidebar-border bg-background"
                />
              </Field>
              <Field label="Project date">
                <Input
                  type="date"
                  value={form.projectDate}
                  onChange={(e) => set("projectDate", e.target.value)}
                  className="border-sidebar-border bg-background"
                />
              </Field>
              <Field label="Schedule publish (optional)">
                <Input
                  type="datetime-local"
                  value={form.publishAt}
                  onChange={(e) => set("publishAt", e.target.value)}
                  className="border-sidebar-border bg-background"
                  aria-label="Schedule publish date and time"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to publish immediately when status is Published.
                </p>
              </Field>
              <Field label="Tools used (comma separated)">
                <Input
                  value={form.tools}
                  onChange={(e) => set("tools", e.target.value)}
                  placeholder="Illustrator, Photoshop, Blender"
                  className="border-sidebar-border bg-background"
                />
              </Field>
              <Field label="Summary * (card preview text)" className="sm:col-span-2">
                <Textarea
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                  rows={2}
                  className="border-sidebar-border bg-background"
                />
              </Field>
              <Field label="Description *" className="sm:col-span-2">
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={5}
                  className="border-sidebar-border bg-background"
                />
              </Field>
              <p
                className="rounded-sm border border-sidebar-border bg-background p-3 text-xs leading-relaxed text-muted-foreground sm:col-span-2"
                role="status"
              >
                Status: <span className="font-semibold text-foreground">{form.status}</span>
                {" · "}
                {form.publishAt
                  ? `Scheduled to go live ${new Date(form.publishAt).toLocaleString()} (once Published).`
                  : "Goes live immediately once Published."}
                {form.status === "ARCHIVED" && " Archived projects are hidden from everyone."}
              </p>
              <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={form.status === "PUBLISHED"} onCheckedChange={(c) => set("status", c ? "PUBLISHED" : "DRAFT")} />
                  Published
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <Switch
                    checked={form.status === "ARCHIVED"}
                    onCheckedChange={(c) => set("status", c ? "ARCHIVED" : "DRAFT")}
                  />
                  Archived (hidden from public)
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={form.featured} onCheckedChange={(c) => set("featured", c)} />
                  Featured on homepage
                </label>
                <label className="flex items-center gap-3 text-sm">
                  Sort order
                  <Input
                    type="number"
                    value={form.order}
                    onChange={(e) => set("order", Number(e.target.value))}
                    className="h-9 w-20 border-sidebar-border bg-background"
                  />
                </label>
              </div>
            </TabsContent>

            {/* Case study narrative */}
            <TabsContent value="story" className="grid gap-4 pt-4">
              {(
                [
                  ["objectives", "Project objectives"],
                  ["challenges", "Creative challenges"],
                  ["research", "Research & inspiration"],
                  ["strategy", "Design strategy"],
                  ["concept", "Concept development"],
                  ["outcome", "Outcome & results"],
                ] as const
              ).map(([field, label]) => (
                <Field key={field} label={label}>
                  <Textarea
                    value={form[field]}
                    onChange={(e) => set(field, e.target.value)}
                    rows={3}
                    className="border-sidebar-border bg-background"
                  />
                </Field>
              ))}

              <Field label="Colour palette">
                <div className="space-y-2">
                  {form.paletteRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={row.name}
                        onChange={(e) => {
                          const rows = [...form.paletteRows];
                          rows[i] = { ...rows[i], name: e.target.value };
                          set("paletteRows", rows);
                        }}
                        placeholder="Name"
                        className="border-sidebar-border bg-background"
                      />
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(row.hex) ? row.hex : "#000000"}
                        onChange={(e) => {
                          const rows = [...form.paletteRows];
                          rows[i] = { ...rows[i], hex: e.target.value.toUpperCase() };
                          set("paletteRows", rows);
                        }}
                        className="h-10 w-12 cursor-pointer border border-sidebar-border bg-background"
                        aria-label={`Colour for ${row.name || `row ${i + 1}`}`}
                      />
                      <Input
                        value={row.hex}
                        onChange={(e) => {
                          const rows = [...form.paletteRows];
                          rows[i] = { ...rows[i], hex: e.target.value.toUpperCase() };
                          set("paletteRows", rows);
                        }}
                        placeholder="#080808"
                        className="w-28 border-sidebar-border bg-background font-mono text-sm"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => set("paletteRows", form.paletteRows.filter((_, j) => j !== i))}
                        aria-label="Remove colour"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {form.paletteRows.length < 8 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => set("paletteRows", [...form.paletteRows, { name: "", hex: "#C6FF00" }])}
                      className="border-sidebar-border"
                    >
                      <Plus className="size-3.5" aria-hidden /> Add colour
                    </Button>
                  )}
                </div>
              </Field>

              <Field label="Typography (comma separated)">
                <Input
                  value={form.typography}
                  onChange={(e) => set("typography", e.target.value)}
                  placeholder='["Neue Haas Grotesk Display", "GT America Mono"] or plain comma list'
                  className="border-sidebar-border bg-background"
                />
              </Field>
              <Field label="Design applications / deliverables (comma separated)">
                <Input
                  value={form.applications}
                  onChange={(e) => set("applications", e.target.value)}
                  placeholder="Logo suite, Packaging, Brand guidelines"
                  className="border-sidebar-border bg-background"
                />
              </Field>
            </TabsContent>

            {/* Visuals */}
            <TabsContent value="visuals" className="grid gap-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Thumbnail (cards & grids)">
                  <MediaSlot
                    url={form.thumbnailUrl}
                    onPick={() => setPickerField("thumbnailUrl")}
                    onClear={() => set("thumbnailUrl", "")}
                  />
                </Field>
                <Field label="Cover image (case study hero)">
                  <MediaSlot
                    url={form.coverUrl}
                    onPick={() => setPickerField("coverUrl")}
                    onClear={() => set("coverUrl", "")}
                  />
                </Field>
              </div>

              <Field label={`Gallery (${gallery.length} images — reorder with arrows)`}>
                <div className="space-y-2">
                  {gallery.map((g, i) => (
                    <div key={`${g.url}-${i}`} className="flex items-center gap-2 rounded-sm border border-sidebar-border bg-background p-2">
                      <img src={g.url} alt={g.alt || ""} className="h-14 w-20 shrink-0 object-cover" />
                      <Input
                        value={g.alt ?? ""}
                        onChange={(e) =>
                          setGallery((gs) => gs.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))
                        }
                        placeholder="Alt text"
                        className="h-9 border-sidebar-border bg-elevated text-xs"
                      />
                      <Input
                        value={g.caption ?? ""}
                        onChange={(e) =>
                          setGallery((gs) => gs.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))
                        }
                        placeholder="Caption"
                        className="h-9 border-sidebar-border bg-elevated text-xs"
                      />
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" onClick={() => moveGallery(i, -1)} disabled={i === 0} aria-label="Move up">
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => moveGallery(i, 1)} disabled={i === gallery.length - 1} aria-label="Move down">
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setGallery((gs) => gs.filter((_, j) => j !== i))}
                          aria-label="Remove from gallery"
                          className="text-destructive"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setPickerField("gallery")} className="border-sidebar-border">
                    <ImagePlus className="size-3.5" aria-hidden /> Add from media library
                  </Button>
                </div>
              </Field>
            </TabsContent>

            {/* SEO */}
            <TabsContent value="seo" className="grid gap-4 pt-4">
              <Field label="SEO title">
                <Input
                  value={form.seoTitle}
                  onChange={(e) => set("seoTitle", e.target.value)}
                  className="border-sidebar-border bg-background"
                  placeholder="Overrides the default page title"
                />
              </Field>
              <Field label="SEO description">
                <Textarea
                  value={form.seoDescription}
                  onChange={(e) => set("seoDescription", e.target.value)}
                  rows={3}
                  className="border-sidebar-border bg-background"
                  placeholder="~160 characters for search snippets"
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Preview slug: <span className="font-mono text-foreground/80">/portfolio/{form.slug || "…"}</span>
              </p>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-end gap-3 border-t border-sidebar-border pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-sidebar-border">
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={saveMutation.isPending}
              className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Create project"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media picker */}
      <Dialog open={!!pickerField} onOpenChange={(o) => !o && setPickerField(null)}>
        <DialogContent className="admin-scroll max-h-[80vh] max-w-3xl overflow-y-auto border-sidebar-border bg-elevated">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {pickerField === "gallery" ? "Add gallery images" : "Choose image"}
            </DialogTitle>
          </DialogHeader>
          {media?.data.length ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {media.data.map((a) => (
                <button
                  key={a.id}
                  onClick={() => pickMedia(a)}
                  className="group relative aspect-square overflow-hidden rounded-sm border border-sidebar-border"
                  aria-label={`Select ${a.originalName}`}
                >
                  <img src={a.url} alt={a.alt || a.originalName} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  {pickerField === "gallery" && gallery.some((g) => g.url === a.url) && (
                    <span className="absolute inset-0 flex items-center justify-center bg-primary/80 text-xs font-semibold text-primary-foreground">
                      Added
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Media library is empty — upload images in the Media Library tab first.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function MediaSlot({ url, onPick, onClear }: { url: string; onPick: () => void; onClear: () => void }) {
  return (
    <div className="space-y-2">
      {url ? (
        <div className="relative">
          <img src={url} alt="Selected" className="aspect-[16/9] w-full rounded-sm border border-sidebar-border object-cover" />
          <Button size="icon" variant="ghost" onClick={onClear} className="absolute right-2 top-2 bg-black/60 text-white" aria-label="Clear image">
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          onClick={onPick}
          className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-sidebar-border text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <ImagePlus className="size-5" aria-hidden />
          Choose from media library
        </button>
      )}
      {url && (
        <Button size="sm" variant="outline" onClick={onPick} className="w-full border-sidebar-border text-xs">
          Replace
        </Button>
      )}
    </div>
  );
}
