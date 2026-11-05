"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Briefcase, GraduationCap, BadgeCheck, Trophy } from "lucide-react";

type Kind = "experience" | "education" | "certifications" | "achievements";

type FieldDef = { name: string; label: string; type: "text" | "textarea" | "number" | "date" | "switch"; span?: boolean };

const FIELDS: Record<Kind, FieldDef[]> = {
  experience: [
    { name: "role", label: "Role", type: "text" },
    { name: "company", label: "Company", type: "text" },
    { name: "location", label: "Location", type: "text" },
    { name: "startDate", label: "Start date", type: "date" },
    { name: "endDate", label: "End date (empty if current)", type: "date" },
    { name: "current", label: "Currently working here", type: "switch" },
    { name: "order", label: "Sort order", type: "number" },
    { name: "description", label: "Description", type: "textarea", span: true },
  ],
  education: [
    { name: "degree", label: "Degree", type: "text" },
    { name: "institution", label: "Institution", type: "text" },
    { name: "field", label: "Field of study", type: "text" },
    { name: "startDate", label: "Start date", type: "date" },
    { name: "endDate", label: "End date (empty if ongoing)", type: "date" },
    { name: "order", label: "Sort order", type: "number" },
    { name: "description", label: "Description", type: "textarea", span: true },
  ],
  certifications: [
    { name: "name", label: "Certification name", type: "text" },
    { name: "issuer", label: "Issuer", type: "text" },
    { name: "issueDate", label: "Issue date", type: "date" },
    { name: "credentialUrl", label: "Credential URL", type: "text" },
    { name: "order", label: "Sort order", type: "number" },
    { name: "description", label: "Description", type: "textarea", span: true },
  ],
  achievements: [
    { name: "title", label: "Title", type: "text" },
    { name: "organization", label: "Organization", type: "text" },
    { name: "year", label: "Year", type: "number" },
    { name: "order", label: "Sort order", type: "number" },
    { name: "description", label: "Description", type: "textarea", span: true },
  ],
};

const META: Record<Kind, { label: string; icon: React.ComponentType<{ className?: string }>; api: typeof adminApi.experience }> = {
  experience: { label: "Experience", icon: Briefcase, api: adminApi.experience },
  education: { label: "Education", icon: GraduationCap, api: adminApi.education },
  certifications: { label: "Certifications", icon: BadgeCheck, api: adminApi.certifications },
  achievements: { label: "Achievements", icon: Trophy, api: adminApi.achievements },
};

export function AdminResume() {
  return (
    <Tabs defaultValue="experience">
      <TabsList className="bg-muted">
        <TabsTrigger value="experience">Experience</TabsTrigger>
        <TabsTrigger value="education">Education</TabsTrigger>
        <TabsTrigger value="certifications">Certifications</TabsTrigger>
        <TabsTrigger value="achievements">Achievements</TabsTrigger>
      </TabsList>
      {(["experience", "education", "certifications", "achievements"] as Kind[]).map((kind) => (
        <TabsContent key={kind} value={kind}>
          <ResumeSection kind={kind} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ResumeSection({ kind }: { kind: Kind }) {
  const qc = useQueryClient();
  const meta = META[kind];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");

  const listKey = ["admin", kind] as const;
  const { data, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: meta.api as unknown as () => Promise<Array<Record<string, unknown> & { id: string }>>,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", kind] });
    qc.invalidateQueries({ queryKey: ["resume"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fn =
        kind === "experience"
          ? editingId
            ? adminApi.updateExperience
            : adminApi.createExperience
          : kind === "education"
            ? editingId
              ? adminApi.updateEducation
              : adminApi.createEducation
            : kind === "certifications"
              ? editingId
                ? adminApi.updateCertification
                : adminApi.createCertification
              : editingId
                ? adminApi.updateAchievement
                : adminApi.createAchievement;
      if (editingId) return fn(editingId, form);
      return fn(form) as Promise<unknown>;
    },
    onSuccess: () => {
      toast.success(editingId ? "Saved" : "Created");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      const fn =
        kind === "experience"
          ? adminApi.deleteExperience
          : kind === "education"
            ? adminApi.deleteEducation
            : kind === "certifications"
              ? adminApi.deleteCertification
              : adminApi.deleteAchievement;
      return fn(id);
    },
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditingId(null);
    setForm(
      Object.fromEntries(
        FIELDS[kind].map((f) => [f.name, f.type === "switch" ? false : f.type === "number" ? undefined : ""])
      )
    );
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (row: Record<string, unknown> & { id: string }) => {
    setEditingId(row.id);
    setForm(
      Object.fromEntries(
        FIELDS[kind].map((f) => [
          f.name,
          f.type === "date" && typeof row[f.name] === "string"
            ? String(row[f.name]).slice(0, 10)
            : row[f.name] ?? (f.type === "switch" ? false : undefined),
        ])
      )
    );
    setError("");
    setDialogOpen(true);
  };

  const submit = () => {
    setError("");
    const required = FIELDS[kind].find((f) => f.type === "text" && !f.name.includes("Url") && f.name !== "field" && f.name !== "location" && f.name !== "organization");
    if (required && !String(form[required.name] ?? "").trim()) {
      return setError(`${required.label} is required.`);
    }
    saveMutation.mutate();
  };

  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} entries</p>
        <Button
          onClick={openNew}
          className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" aria-hidden /> Add entry
        </Button>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-sm bg-elevated" aria-busy />
      ) : rows.length === 0 ? (
        <div className="border border-sidebar-border bg-elevated p-10 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </div>
      ) : (
        <ul className="divide-y divide-sidebar-border border border-sidebar-border bg-elevated">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {String(row.role ?? row.degree ?? row.name ?? row.title ?? "—")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {String(row.company ?? row.institution ?? row.issuer ?? row.organization ?? "")}
                </p>
              </div>
              <div className="flex gap-1.5">
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
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="admin-scroll max-h-[85vh] max-w-2xl overflow-y-auto border-sidebar-border bg-elevated">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? "Edit entry" : "New entry"}</DialogTitle>
          </DialogHeader>
          {error && (
            <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS[kind].map((f) => (
              <div key={f.name} className={`space-y-1.5 ${f.span || f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{f.label}</Label>
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
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={form[f.name] === null || form[f.name] === undefined ? "" : String(form[f.name])}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        [f.name]:
                          f.type === "number"
                            ? e.target.value === "" ? undefined : Number(e.target.value)
                            : e.target.value,
                      }))
                    }
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
