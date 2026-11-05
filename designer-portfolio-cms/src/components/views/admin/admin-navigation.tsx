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
import type { NavigationItem } from "@/lib/cms-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { GripVertical, Link2, Loader2, Menu, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Position = "HEADER" | "FOOTER";

interface NavForm {
  label: string;
  path: string;
  position: Position;
  isVisible: boolean;
  openInNew: boolean;
}

const EMPTY_FORM: NavForm = {
  label: "",
  path: "",
  position: "HEADER",
  isVisible: true,
  openInNew: false,
};

export function AdminNavigation() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<NavigationItem | "new" | null>(null);
  const [newPosition, setNewPosition] = useState<Position>("HEADER");
  const [deleteTarget, setDeleteTarget] = useState<NavigationItem | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "navigation"],
    queryFn: adminApi.navigation,
  });

  const items = data ?? [];
  const headerItems = items.filter((i) => i.position === "HEADER");
  const footerItems = items.filter((i) => i.position === "FOOTER");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "navigation"] });
    qc.invalidateQueries({ queryKey: ["navigation"] });
  };

  const patchMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateNavigationItem(id, payload),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteNavigationItem(id),
    onSuccess: () => {
      invalidate();
      toast.success("Link deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: (order: number[]) => adminApi.reorderNavigation(order),
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

  /**
   * Reorder within one group. The backend assigns order = index across the
   * flat list we send, so we always send ALL ids: header items (in their
   * new order) followed by footer items (unchanged relative order) — or the
   * mirror image when the footer is being dragged.
   */
  const handleDragEnd = (position: Position, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const group = position === "HEADER" ? headerItems : footerItems;
    const other = position === "HEADER" ? footerItems : headerItems;
    const oldIndex = group.findIndex((i) => String(i.id) === String(active.id));
    const newIndex = group.findIndex((i) => String(i.id) === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(group, oldIndex, newIndex);
    qc.setQueryData(["admin", "navigation"], [...reordered, ...other]); // optimistic
    reorderMutation.mutate([...reordered, ...other].map((i) => Number(i.id)));
  };

  return (
    <div className="max-w-4xl space-y-8">
      <p className="text-sm text-muted-foreground">
        These links build the site header and footer. Drag to reorder within a group — the site
        updates immediately.
      </p>

      {isLoading ? (
        <div className="space-y-3" aria-busy>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-sm bg-elevated" />
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-sm border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          Could not load navigation — please refresh the page.
        </p>
      ) : (
        <>
          <NavGroup
            title="Header links"
            description="Shown in the top navigation bar"
            icon={Menu}
            items={headerItems}
            sensors={sensors}
            busy={patchMutation.isPending}
            onDragEnd={(e) => handleDragEnd("HEADER", e)}
            onToggleVisible={(item) =>
              patchMutation.mutate({
                id: String(item.id),
                payload: { isVisible: !item.isVisible },
              })
            }
            onToggleNewTab={(item) =>
              patchMutation.mutate({
                id: String(item.id),
                payload: { openInNew: !item.openInNew },
              })
            }
            onEdit={(item) => setEditing(item)}
            onDelete={(item) => setDeleteTarget(item)}
            onAdd={() => {
              setNewPosition("HEADER");
              setEditing("new");
            }}
          />

          <NavGroup
            title="Footer links"
            description="Shown at the bottom of every page"
            icon={Link2}
            items={footerItems}
            sensors={sensors}
            busy={patchMutation.isPending}
            onDragEnd={(e) => handleDragEnd("FOOTER", e)}
            onToggleVisible={(item) =>
              patchMutation.mutate({
                id: String(item.id),
                payload: { isVisible: !item.isVisible },
              })
            }
            onToggleNewTab={(item) =>
              patchMutation.mutate({
                id: String(item.id),
                payload: { openInNew: !item.openInNew },
              })
            }
            onEdit={(item) => setEditing(item)}
            onDelete={(item) => setDeleteTarget(item)}
            onAdd={() => {
              setNewPosition("FOOTER");
              setEditing("new");
            }}
          />
        </>
      )}

      {/* Add / edit dialog */}
      <NavItemDialog
        item={editing === "new" ? null : editing}
        initialPosition={newPosition}
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={() => {
          setEditing(null);
          invalidate();
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-sidebar-border bg-elevated">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete this link?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `"${deleteTarget.label}" (${deleteTarget.path}) will be removed from the site navigation.`}
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
              Delete link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── One sortable group (HEADER or FOOTER) ──────────────────────────────── */

function NavGroup({
  title,
  description,
  icon: Icon,
  items,
  sensors,
  busy,
  onDragEnd,
  onToggleVisible,
  onToggleNewTab,
  onEdit,
  onDelete,
  onAdd,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavigationItem[];
  sensors: ReturnType<typeof useSensors>;
  busy: boolean;
  onDragEnd: (e: DragEndEvent) => void;
  onToggleVisible: (item: NavigationItem) => void;
  onToggleNewTab: (item: NavigationItem) => void;
  onEdit: (item: NavigationItem) => void;
  onDelete: (item: NavigationItem) => void;
  onAdd: () => void;
}) {
  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
            <Icon className="size-4 text-primary" aria-hidden /> {title}
            <Badge className="rounded-full bg-muted px-2 py-0 text-[10px] text-muted-foreground">
              {items.length}
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 border-sidebar-border" onClick={onAdd}>
          <Plus className="size-3.5" aria-hidden /> Add link
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-sm border border-dashed border-sidebar-border p-6 text-center text-sm text-muted-foreground">
          No links in this group yet.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={items.map((i) => String(i.id))}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {items.map((item, index) => (
                <SortableNavRow
                  key={item.id}
                  item={item}
                  index={index}
                  busy={busy}
                  onToggleVisible={() => onToggleVisible(item)}
                  onToggleNewTab={() => onToggleNewTab(item)}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function SortableNavRow({
  item,
  index,
  busy,
  onToggleVisible,
  onToggleNewTab,
  onEdit,
  onDelete,
}: {
  item: NavigationItem;
  index: number;
  busy: boolean;
  onToggleVisible: () => void;
  onToggleNewTab: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(item.id) });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-sm border bg-elevated p-3 transition-colors",
        isDragging ? "z-10 border-primary/60 shadow-lg" : "border-sidebar-border",
        !item.isVisible && "opacity-70"
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="touch-none rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={`Reorder ${item.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>

      <span className="w-6 shrink-0 text-center font-heading text-sm text-muted-foreground">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.label}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{item.path}</p>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={item.isVisible} onCheckedChange={onToggleVisible} disabled={busy} aria-label={`Show ${item.label}`} />
          Visible
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={item.openInNew} onCheckedChange={onToggleNewTab} disabled={busy} aria-label={`Open ${item.label} in a new tab`} />
          New tab
        </label>
      </div>

      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={onEdit} aria-label={`Edit ${item.label}`}>
          <Pencil className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
          aria-label={`Delete ${item.label}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

/* ── Add / edit dialog ──────────────────────────────────────────────────── */

function NavItemDialog({
  item,
  initialPosition,
  open,
  onOpenChange,
  onSaved,
}: {
  item: NavigationItem | null;
  initialPosition: Position;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState<NavForm>(
    item
      ? {
          label: item.label,
          path: item.path,
          position: item.position,
          isVisible: item.isVisible,
          openInNew: item.openInNew,
        }
      : { ...EMPTY_FORM, position: initialPosition }
  );
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  const seedKey = `${item?.id ?? "new"}-${open}`;
  if (open && seedKey !== key) {
    setKey(seedKey);
    setForm(
      item
        ? {
            label: item.label,
            path: item.path,
            position: item.position,
            isVisible: item.isVisible,
            openInNew: item.openInNew,
          }
        : { ...EMPTY_FORM, position: initialPosition }
    );
  }

  const set = <K extends keyof NavForm>(field: K, value: NavForm[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const save = async () => {
    if (!form.label.trim()) {
      toast.error("Please give the link a label.");
      return;
    }
    if (!form.path.trim()) {
      toast.error("Please set the path (e.g. /portfolio).");
      return;
    }
    setSaving(true);
    const payload = {
      label: form.label,
      path: form.path,
      position: form.position,
      isVisible: form.isVisible,
      openInNew: form.openInNew,
    };
    try {
      if (isEdit && item) {
        await adminApi.updateNavigationItem(String(item.id), payload);
        toast.success("Link updated");
      } else {
        await adminApi.createNavigationItem(payload);
        toast.success("Link added");
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-sidebar-border bg-elevated">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {isEdit ? "Edit link" : "Add navigation link"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Position in the list is controlled by dragging — no number needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nav-label" className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Label *
            </Label>
            <Input
              id="nav-label"
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Portfolio"
              className="border-sidebar-border bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nav-path" className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Path *
            </Label>
            <Input
              id="nav-path"
              value={form.path}
              onChange={(e) => set("path", e.target.value)}
              placeholder="/portfolio"
              className="border-sidebar-border bg-background font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Internal pages use /about, /portfolio, /services… Full URLs open externally.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Position
            </Label>
            <Select value={form.position} onValueChange={(v) => set("position", v as Position)}>
              <SelectTrigger className="border-sidebar-border bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-sidebar-border bg-elevated">
                <SelectItem value="HEADER">Header</SelectItem>
                <SelectItem value="FOOTER">Footer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-8 rounded-sm border border-sidebar-border bg-background p-4">
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={form.isVisible} onCheckedChange={(c) => set("isVisible", c)} />
              Visible
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={form.openInNew} onCheckedChange={(c) => set("openInNew", c)} />
              Open in new tab
            </label>
          </div>

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
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add link"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
