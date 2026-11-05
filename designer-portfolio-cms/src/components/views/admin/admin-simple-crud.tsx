"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type Resource = "categories" | "services" | "skills" | "testimonials" | "social";

type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "switch" | "date";
  options?: { value: string; label: string }[];
  placeholder?: string;
  span?: boolean;
};

interface Row extends Record<string, unknown> {
  id: string;
}

const CONFIG: Record<
  Resource,
  {
    title: string;
    fields: FieldDef[];
    columns: (row: Row) => { label: string; value: React.ReactNode }[];
    toForm: (row: Row | null) => Record<string, unknown>;
    create: (d: Record<string, unknown>) => Promise<unknown>;
    update: (id: string, d: Record<string, unknown>) => Promise<unknown>;
    remove: (id: string) => Promise<unknown>;
    listKey: string;
    extraInvalidates?: string[];
  }
> = {
  categories: {
    title: "Categories",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Brand Identity" },
      { name: "slug", label: "Slug", type: "text", placeholder: "brand-identity" },
      { name: "description", label: "Description", type: "textarea", span: true },
      { name: "order", label: "Sort order", type: "number" },
    ],
    columns: (r) => [
      { label: "Name", value: String(r.name) },
      { label: "Slug", value: <span className="font-mono text-xs">{String(r.slug)}</span> },
      { label: "Projects", value: String((r._count as { projects: number } | undefined)?.projects ?? 0) },
    ],
    toForm: (r) => ({
      name: r?.name ?? "",
      slug: r?.slug ?? "",
      description: r?.description ?? "",
      order: Number(r?.order ?? 0),
    }),
    create: (d) => adminApi.createCategory(d),
    update: (id, d) => adminApi.updateCategory(id, d),
    remove: (id) => adminApi.deleteCategory(id),
    listKey: "categories",
    extraInvalidates: ["categories"],
  },
  services: {
    title: "Services",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "slug", label: "Slug", type: "text" },
      { name: "shortDescription", label: "Short description", type: "textarea", span: true },
      { name: "description", label: "Full description", type: "textarea", span: true },
      { name: "deliverables", label: "Deliverables — comma separated (stored as list)", type: "text", span: true },
      { name: "approach", label: "Approach", type: "textarea", span: true },
      { name: "icon", label: "Icon name (lucide)", type: "text" },
      { name: "order", label: "Sort order", type: "number" },
      { name: "featured", label: "Featured on homepage", type: "switch" },
    ],
    columns: (r) => [
      { label: "Title", value: String(r.title) },
      { label: "Slug", value: <span className="font-mono text-xs">{String(r.slug)}</span> },
      { label: "Featured", value: r.featured ? "Yes" : "—" },
    ],
    toForm: (r) => ({
      title: r?.title ?? "",
      slug: r?.slug ?? "",
      shortDescription: r?.shortDescription ?? "",
      description: r?.description ?? "",
      deliverables: r?.deliverables ?? "",
      approach: r?.approach ?? "",
      icon: r?.icon ?? "",
      order: Number(r?.order ?? 0),
      featured: Boolean(r?.featured),
    }),
    create: (d) => adminApi.createService(d),
    update: (id, d) => adminApi.updateService(id, d),
    remove: (id) => adminApi.deleteService(id),
    listKey: "services",
    extraInvalidates: ["services"],
  },
  skills: {
    title: "Skills",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Adobe Illustrator" },
      {
        name: "category",
        label: "Category",
        type: "select",
        options: [
          { value: "SOFTWARE", label: "Software" },
          { value: "EXPERTISE", label: "Expertise" },
        ],
      },
      { name: "level", label: "Level (0–100)", type: "number" },
      { name: "order", label: "Sort order", type: "number" },
    ],
    columns: (r) => [
      { label: "Name", value: String(r.name) },
      { label: "Category", value: String(r.category) },
      { label: "Level", value: `${r.level}%` },
    ],
    toForm: (r) => ({
      name: r?.name ?? "",
      category: r?.category ?? "SOFTWARE",
      level: Number(r?.level ?? 80),
      order: Number(r?.order ?? 0),
    }),
    create: (d) => adminApi.createSkill(d),
    update: (id, d) => adminApi.updateSkill(id, d),
    remove: (id) => adminApi.deleteSkill(id),
    listKey: "skills",
    extraInvalidates: ["skills"],
  },
  testimonials: {
    title: "Testimonials",
    fields: [
      { name: "clientName", label: "Client name", type: "text" },
      { name: "company", label: "Company", type: "text" },
      { name: "review", label: "Review", type: "textarea", span: true },
      { name: "projectReference", label: "Project reference", type: "text" },
      { name: "rating", label: "Rating 1–5 (only if genuinely provided)", type: "number" },
      { name: "date", label: "Date", type: "date" },
      { name: "order", label: "Sort order", type: "number" },
      { name: "published", label: "Published (approved)", type: "switch" },
      { name: "featured", label: "Featured on homepage", type: "switch" },
    ],
    columns: (r) => [
      { label: "Client", value: String(r.clientName) },
      { label: "Company", value: String(r.company ?? "—") },
      {
        label: "Status",
        value: (
          <span className={r.published ? "text-primary" : "text-muted-foreground"}>
            {r.published ? "Published" : "Pending"}
          </span>
        ),
      },
    ],
    toForm: (r) => ({
      clientName: r?.clientName ?? "",
      company: r?.company ?? "",
      review: r?.review ?? "",
      projectReference: r?.projectReference ?? "",
      rating: r?.rating ?? undefined,
      date: r?.date ? String(r.date).slice(0, 10) : "",
      order: Number(r?.order ?? 0),
      published: Boolean(r?.published),
      featured: Boolean(r?.featured),
    }),
    create: (d) => adminApi.createTestimonial(d),
    update: (id, d) => adminApi.updateTestimonial(id, d),
    remove: (id) => adminApi.deleteTestimonial(id),
    listKey: "testimonials",
    extraInvalidates: ["testimonials"],
  },
  social: {
    title: "Social Links",
    fields: [
      { name: "platform", label: "Platform", type: "text", placeholder: "Behance" },
      { name: "label", label: "Display label", type: "text", placeholder: "Behance" },
      { name: "url", label: "URL", type: "text", placeholder: "https://behance.net/…" },
      { name: "order", label: "Sort order", type: "number" },
      { name: "visible", label: "Visible on site", type: "switch" },
    ],
    columns: (r) => [
      { label: "Platform", value: String(r.platform) },
      { label: "URL", value: <span className="truncate font-mono text-xs">{String(r.url)}</span> },
      { label: "Visible", value: r.visible ? "Yes" : "No" },
    ],
    toForm: (r) => ({
      platform: r?.platform ?? "",
      label: r?.label ?? "",
      url: r?.url ?? "",
      order: Number(r?.order ?? 0),
      visible: r?.visible === undefined ? true : Boolean(r.visible),
    }),
    create: (d) => adminApi.createSocial(d),
    update: (id, d) => adminApi.updateSocial(id, d),
    remove: (id) => adminApi.deleteSocial(id),
    listKey: "social",
    extraInvalidates: ["profile", "settings"],
  },
};

export function AdminSimpleCrud({ resource }: { resource: Resource }) {
  const cfg = CONFIG[resource];
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(cfg.toForm(null));
  const [error, setError] = useState("");
  const [seedKey, setSeedKey] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", cfg.listKey],
    queryFn: async () => {
      switch (cfg.listKey) {
        case "categories":
          return adminApi.categories();
        case "social":
          return adminApi.social();
        case "services":
          return adminApi.services();
        case "skills":
          return adminApi.skills();
        default:
          return adminApi.testimonials();
      }
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", cfg.listKey] });
    cfg.extraInvalidates?.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) return cfg.update(editingId, form);
      return cfg.create(form);
    },
    onSuccess: () => {
      toast.success(editingId ? "Saved" : "Created");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cfg.remove(id),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditingId(null);
    setForm(cfg.toForm(null));
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditingId(row.id);
    setForm(cfg.toForm(row));
    setError("");
    setDialogOpen(true);
  };

  const submit = () => {
    setError("");
    const firstText = cfg.fields.find((f) => (f.type === "text" || f.type === "textarea") && f.name !== "slug");
    if (firstText) {
      const v = String(form[firstText.name] ?? "").trim();
      if (!v) return setError(`${firstText.label} is required.`);
    }
    saveMutation.mutate();
  };

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} entries</p>
        <Button
          onClick={openNew}
          className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" aria-hidden /> Add {cfg.title.slice(0, -1).toLowerCase()}
        </Button>
      </div>

      {isLoading ? (
        <div className="h-60 animate-pulse rounded-sm bg-elevated" aria-busy />
      ) : (
        <div className="overflow-x-auto border border-sidebar-border bg-elevated">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-sidebar-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {cfg.fields
                  .filter((f) => ["text", "select", "textarea"].some((t) => t === f.type))
                  .slice(0, 2)
                  .map((f) => (
                    <th key={f.name} className="p-4 font-medium">{f.label}</th>
                  ))}
                <th className="p-4 font-medium">Details</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sidebar-border">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-muted-foreground">
                    Nothing here yet.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-sidebar-accent/40">
                  {cfg.columns(row).map((c, i) => (
                    <td key={i} className={i === 0 ? "p-4 font-medium" : "p-4 text-muted-foreground"}>
                      {c.value}
                    </td>
                  ))}
                  <td className="p-4 text-muted-foreground">
                    {cfg.columns(row).slice(2).map((c) => (
                      <span key={c.label} className="mr-3 inline-flex items-center gap-1">
                        <span className="text-[10px] uppercase tracking-wide opacity-60">{c.label}:</span>
                        {c.value}
                      </span>
                    ))}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(row)} aria-label="Edit">
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this entry?")) deleteMutation.mutate(row.id);
                        }}
                        aria-label="Delete"
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} key={seedKey}>
        <DialogContent className="admin-scroll max-h-[85vh] max-w-2xl overflow-y-auto border-sidebar-border bg-elevated">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingId ? "Edit entry" : `New ${cfg.title.slice(0, -1).toLowerCase()}`}
            </DialogTitle>
          </DialogHeader>
          {error && (
            <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {cfg.fields.map((f) => (
              <div key={f.name} className={`space-y-1.5 ${f.span || f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {f.label}
                </Label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={String(form[f.name] ?? "")}
                    onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
                    rows={3}
                    className="border-sidebar-border bg-background"
                  />
                ) : f.type === "switch" ? (
                  <label className="flex items-center gap-3 text-sm">
                    <Switch
                      checked={Boolean(form[f.name])}
                      onCheckedChange={(c) => setForm((p) => ({ ...p, [f.name]: c }))}
                    />
                    <span className="text-muted-foreground">{f.label}</span>
                  </label>
                ) : f.type === "select" ? (
                  <select
                    value={String(form[f.name] ?? "")}
                    onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
                    className="h-10 w-full rounded-sm border border-sidebar-border bg-background px-3 text-sm"
                  >
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={String(form[f.name] ?? "")}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        [f.name]: f.type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value,
                      }))
                    }
                    placeholder={f.placeholder}
                    className="border-sidebar-border bg-background"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 border-t border-sidebar-border pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-sidebar-border">
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={saveMutation.isPending}
              className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : editingId ? "Save" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
