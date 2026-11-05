"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminApi, ApiError } from "@/services/api";
import type { ContactInquiry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Archive, Trash2, MailOpen, Mail, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_TABS = ["ALL", "UNREAD", "READ", "ARCHIVED"] as const;

export function AdminInquiries() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ContactInquiry | null>(null);
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "inquiries", status, q],
    queryFn: () =>
      adminApi.inquiries({ ...(status !== "ALL" ? { status } : {}), ...(q ? { q } : {}) }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "inquiries"] });
    qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { status?: string; adminNotes?: string } }) =>
      adminApi.updateInquiry(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Inquiry updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteInquiry(id),
    onSuccess: () => {
      invalidate();
      setSelected(null);
      toast.success("Inquiry deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inquiries = data?.data ?? [];

  const openDetail = (inq: ContactInquiry) => {
    setSelected(inq);
    setNotes(inq.adminNotes ?? "");
    if (inq.status === "UNREAD") {
      updateMutation.mutate({ id: inq.id, payload: { status: "READ" } });
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-sm px-3.5 py-2 text-xs font-medium transition-colors",
                status === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-elevated text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "ALL" ? "All" : s}
              {s === "UNREAD" && inquiries.some((i) => i.status === "UNREAD") && (
                <span className="ml-1.5 inline-block size-1.5 rounded-full bg-destructive" aria-hidden />
              )}
            </button>
          ))}
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, message…"
          className="h-10 max-w-xs border-sidebar-border bg-elevated"
          aria-label="Search inquiries"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-sm bg-elevated" aria-busy />
      ) : inquiries.length === 0 ? (
        <div className="border border-sidebar-border bg-elevated p-12 text-center text-sm text-muted-foreground">
          No inquiries found.
        </div>
      ) : (
        <ul className="divide-y divide-sidebar-border border border-sidebar-border bg-elevated">
          {inquiries.map((inq) => (
            <li key={inq.id}>
              <button
                onClick={() => openDetail(inq)}
                className={cn(
                  "flex w-full flex-wrap items-start justify-between gap-4 p-5 text-left transition-colors hover:bg-sidebar-accent/40",
                  inq.status === "UNREAD" && "border-l-2 border-primary"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {inq.status === "UNREAD" && (
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                    )}
                    <p className="truncate font-medium">{inq.fullName}</p>
                    <span className="text-xs text-muted-foreground">· {inq.email}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{inq.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {new Date(inq.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      inq.status === "UNREAD" && "bg-primary text-primary-foreground",
                      inq.status === "READ" && "bg-muted text-muted-foreground",
                      inq.status === "ARCHIVED" && "bg-muted/50 text-muted-foreground"
                    )}
                  >
                    {inq.status}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-sidebar-border bg-elevated admin-scroll">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">{selected.fullName}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(selected.createdAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </DialogHeader>

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Email" value={<a href={`mailto:${selected.email}`} className="text-primary hover:underline">{selected.email}</a>} />
                <Detail label="Project type" value={selected.projectType} />
                <Detail label="Company" value={selected.company || "—"} />
                <Detail label="Budget" value={selected.budgetRange || "—"} />
                <Detail label="Timeline" value={selected.timeline || "—"} />
                <Detail
                  label="Reference"
                  value={
                    selected.referenceUrl ? (
                      <a href={selected.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Open link ↗
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
              </dl>

              <div className="rounded-sm border border-sidebar-border bg-background p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Message</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{selected.message}</p>
              </div>

              <div>
                <label htmlFor="admin-notes" className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Internal notes
                </label>
                <Textarea
                  id="admin-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="border-sidebar-border bg-background"
                  placeholder="Private notes about this lead…"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-sidebar-border"
                  onClick={() =>
                    updateMutation.mutate({
                      id: selected.id,
                      payload: { status: selected.status === "READ" ? "UNREAD" : "READ", adminNotes: notes },
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  {selected.status === "READ" ? <Mail className="size-4" aria-hidden /> : <MailOpen className="size-4" aria-hidden />}
                  Mark as {selected.status === "READ" ? "unread" : "read"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-sidebar-border"
                  onClick={() =>
                    updateMutation.mutate({ id: selected.id, payload: { status: "ARCHIVED", adminNotes: notes } })
                  }
                  disabled={updateMutation.isPending}
                >
                  <Archive className="size-4" aria-hidden /> Archive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-sidebar-border"
                  onClick={() =>
                    updateMutation.mutate({ id: selected.id, payload: { adminNotes: notes } })
                  }
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" aria-hidden />}
                  Save notes
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="ml-auto"
                  onClick={() => {
                    if (confirm("Delete this inquiry permanently?")) deleteMutation.mutate(selected.id);
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4" aria-hidden /> Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
