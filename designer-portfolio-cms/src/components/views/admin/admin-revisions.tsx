"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi } from "@/services/api";
import type { Revision } from "@/lib/cms-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { Clock, History, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Color-coded badges per revision action. */
const ACTION_STYLES: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  update: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  publish: "bg-lime-500/15 text-lime-400 border-lime-500/30",
  archive: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  restore: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  delete: "bg-red-500/15 text-red-400 border-red-500/30",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/**
 * Revision history dialog: lists every snapshot for one content object,
 * newest first, with an expandable JSON viewer and one-click restore.
 */
export function RevisionHistoryDialog({
  open,
  onOpenChange,
  contentLabel,
  objectId,
  title,
  invalidateKeys,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "cms.homepagesection", "portfolio.project", "cms.themeconfig" */
  contentLabel: string;
  objectId: string | number;
  title?: string;
  /** Extra query keys to invalidate after a successful restore. */
  invalidateKeys?: string[][];
}) {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Revision | null>(null);

  const query = useQuery({
    queryKey: ["admin", "revisions", contentLabel, String(objectId)],
    queryFn: () => adminApi.revisions({ content: contentLabel, id: objectId }),
    enabled: open,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => adminApi.restoreRevision(id),
    onSuccess: () => {
      toast.success("Version restored — the content now matches this snapshot.");
      for (const key of invalidateKeys ?? []) {
        qc.invalidateQueries({ queryKey: key });
      }
      qc.invalidateQueries({ queryKey: ["admin"] });
      query.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revisions = query.data ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="admin-scroll max-h-[85vh] max-w-2xl overflow-y-auto border-sidebar-border bg-elevated">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-lg">
              <History className="size-5 text-primary" aria-hidden />
              Revision history{title ? ` — ${title}` : ""}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Every change is snapshotted automatically. Restoring rewrites the content with an
              older version — the current state is saved as a new revision first, so this is safe
              to try.
            </DialogDescription>
          </DialogHeader>

          {query.isLoading ? (
            <div className="flex h-40 items-center justify-center" aria-busy>
              <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading revisions" />
            </div>
          ) : query.isError ? (
            <p className="py-6 text-center text-sm text-destructive" role="alert">
              Could not load revisions — please try again.
            </p>
          ) : revisions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No revisions yet — history starts recording after the first change.
            </p>
          ) : (
            <ul className="divide-y divide-sidebar-border rounded-sm border border-sidebar-border">
              {revisions.map((r) => {
                const expanded = expandedId === String(r.id);
                return (
                  <li key={r.id} className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          ACTION_STYLES[r.action] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {r.action}
                      </Badge>
                      <span className="text-sm">{formatDateTime(r.createdAt)}</span>
                      <span className="text-xs text-muted-foreground">by {r.createdByName || "system"}</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setExpandedId(expanded ? null : String(r.id))}
                          aria-expanded={expanded}
                        >
                          {expanded ? "Hide data" : "View data"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 border-sidebar-border px-2 text-xs"
                          disabled={r.action === "delete" || restoreMutation.isPending}
                          title={
                            r.action === "delete"
                              ? "Deleted objects cannot be restored automatically"
                              : `Restore this version (${formatDateTime(r.createdAt)})`
                          }
                          onClick={() => setConfirmTarget(r)}
                        >
                          {restoreMutation.isPending ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                          ) : (
                            <RotateCcw className="size-3" aria-hidden />
                          )}
                          Restore
                        </Button>
                      </div>
                    </div>

                    {r.objectRepr && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{r.objectRepr}</p>
                    )}

                    {expanded && (
                      <pre className="admin-scroll mt-2 max-h-64 overflow-y-auto rounded-sm border border-sidebar-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground/80">
                        {JSON.stringify(r.data, null, 2)}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Restore confirmation */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent className="border-sidebar-border bg-elevated">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget &&
                `The content will be replaced with the ${confirmTarget.action} snapshot from ${formatDateTime(
                  confirmTarget.createdAt
                )}. The current state is kept as a new revision, so you can undo this.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-sidebar-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                if (confirmTarget) restoreMutation.mutate(String(confirmTarget.id));
                setConfirmTarget(null);
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Convenience button that opens a RevisionHistoryDialog.
 * Used in the project editor, homepage builder rows, profile/settings forms
 * and the theme editor.
 */
export function RevisionButton({
  contentLabel,
  objectId,
  label = "History",
  invalidateKeys,
  className,
}: {
  contentLabel: string;
  objectId: string | number;
  label?: string;
  invalidateKeys?: string[][];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("gap-1.5 border-sidebar-border text-xs", className)}
        onClick={() => setOpen(true)}
        aria-label={label ? `${label} — revision history` : "Revision history"}
      >
        <Clock className="size-3.5" aria-hidden />
        {label && <span>{label}</span>}
      </Button>
      <RevisionHistoryDialog
        open={open}
        onOpenChange={setOpen}
        contentLabel={contentLabel}
        objectId={objectId}
        invalidateKeys={invalidateKeys}
      />
    </>
  );
}
