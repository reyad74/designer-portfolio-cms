"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { adminApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UploadCloud, Trash2, Loader2, Search, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeMutationError } from "./admin-error-details";

const FOLDERS = ["general", "projects", "profile", "blog"];
const MAX_MB = 5;

export function AdminMedia() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState("all");
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadFolder, setUploadFolder] = useState("projects");
  const [editing, setEditing] = useState<{ id: string; alt: string; caption: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "media", folder, q],
    queryFn: () => adminApi.media({ ...(folder !== "all" ? { folder } : {}), ...(q ? { q } : {}) }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "media"] });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => adminApi.uploadMedia(file, uploadFolder),
    onSuccess: () => {
      invalidate();
      toast.success("Upload complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const altMutation = useMutation({
    mutationFn: ({ id, alt, caption }: { id: string; alt: string; caption: string }) =>
      adminApi.updateMedia(id, { alt, caption }),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success("Asset details saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteMedia(id),
    onSuccess: () => {
      invalidate();
      toast.success("Asset deleted");
    },
    onError: async (e: Error, id) => {
      // 409 responses carry the referencing objects in `details` — surface them.
      toast.error(
        await describeMutationError(e, `/api/v1/admin/media/${id}`, { method: "DELETE" })
      );
    },
  });

  const onPickFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).forEach((f) => {
      if (f.size > MAX_MB * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds the ${MAX_MB} MB limit`);
        return;
      }
      uploadMutation.mutate(f);
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const assets = data?.data ?? [];

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          multiple
          className="sr-only"
          id="media-upload"
          onChange={(e) => onPickFiles(e.target.files)}
        />
        <select
          value={uploadFolder}
          onChange={(e) => setUploadFolder(e.target.value)}
          className="h-10 rounded-sm border border-sidebar-border bg-elevated px-3 text-sm"
          aria-label="Upload folder"
        >
          {FOLDERS.map((f) => (
            <option key={f} value={f}>→ {f}</option>
          ))}
        </select>
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {uploadMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UploadCloud className="size-4" aria-hidden />}
          Upload images
        </Button>
        <span className="text-xs text-muted-foreground">JPEG · PNG · WebP · GIF · SVG — max {MAX_MB} MB</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1">
            {["all", ...FOLDERS].map((f) => (
              <button
                key={f}
                onClick={() => setFolder(f)}
                className={cn(
                  "rounded-sm px-3 py-2 text-xs font-medium capitalize",
                  folder === f ? "bg-primary text-primary-foreground" : "bg-elevated text-muted-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search files…"
              className="h-10 w-44 border-sidebar-border bg-elevated pl-8"
              aria-label="Search media"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-busy>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-sm bg-elevated" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="border border-dashed border-sidebar-border p-14 text-center">
          <UploadCloud className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 text-sm text-muted-foreground">
            No assets yet — upload your first image.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {assets.map((a) => (
            <figure key={a.id} className="group relative overflow-hidden rounded-sm border border-sidebar-border bg-elevated">
              <img
                src={a.url}
                alt={a.alt || a.originalName}
                className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <figcaption className="p-2.5">
                <p className="truncate text-[11px] font-medium" title={a.originalName}>
                  {a.originalName}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {(a.size / 1024).toFixed(0)} KB · {a.folder}
                </p>
              </figcaption>
              <div className="absolute inset-x-0 top-0 flex justify-end gap-1.5 bg-gradient-to-b from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => setEditing({ id: a.id, alt: a.alt ?? "", caption: a.caption ?? "" })}
                  className="rounded-sm bg-black/70 p-1.5 text-white hover:text-primary"
                  aria-label={`Edit alt text for ${a.originalName}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${a.originalName}"? This cannot be undone.`)) {
                      deleteMutation.mutate(a.id);
                    }
                  }}
                  className="rounded-sm bg-black/70 p-1.5 text-white hover:text-destructive"
                  aria-label={`Delete ${a.originalName}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </figure>
          ))}
        </div>
      )}

      {/* Alt text / caption dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md border-sidebar-border bg-elevated">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit image details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Alt text
              </Label>
              <Input
                value={editing?.alt ?? ""}
                onChange={(e) => setEditing((p) => (p ? { ...p, alt: e.target.value } : p))}
                placeholder="Describe this image for screen readers"
                className="border-sidebar-border bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Caption
              </Label>
              <Input
                value={editing?.caption ?? ""}
                onChange={(e) => setEditing((p) => (p ? { ...p, caption: e.target.value } : p))}
                placeholder="Shown under the image where captions are displayed"
                className="border-sidebar-border bg-background"
              />
            </div>
          </div>
          <Button
            onClick={() =>
              editing &&
              altMutation.mutate({ id: editing.id, alt: editing.alt, caption: editing.caption })
            }
            disabled={altMutation.isPending}
            className="w-full bg-primary font-semibold text-primary-foreground"
          >
            {altMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
