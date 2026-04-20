"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Lock, Save, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugifyStatusName } from "@/lib/requestStatus/slugifyStatusName";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

export default function ProjectStatusCard({
  status,
  requestCount,
  canMoveUp = false,
  canMoveDown = false,
  isReordering = false,
  onMoveUp,
  onMoveDown,
}: {
  status: {
    _id: Id<"requestStatuses">;
    type: "custom" | "default";
    displayName: string;
    description?: string;
    color?: string | null;
  };
  requestCount: number;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isReordering?: boolean;
  onMoveUp?: () => Promise<void> | void;
  onMoveDown?: () => Promise<void> | void;
}) {
  const updateStatus = useMutation(api.requestStatuses.update);
  const removeStatus = useMutation(api.requestStatuses.remove);
  const [displayName, setDisplayName] = useState(status.displayName);
  const [description, setDescription] = useState(status.description ?? "");
  const [color, setColor] = useState(status.color ?? "#f97316");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isDefault = status.type === "default";

  useEffect(() => {
    setDisplayName(status.displayName);
    setDescription(status.description ?? "");
    setColor(status.color ?? "#f97316");
    setIsDeleteDialogOpen(false);
  }, [status._id, status.color, status.description, status.displayName]);

  const cleanDisplayName = displayName.trim();
  const cleanDescription = description.trim();
  const previewName = cleanDisplayName.length > 0 ? cleanDisplayName : status.displayName;
  const isInvalidName = cleanDisplayName.length < 2 || !slugifyStatusName(cleanDisplayName);
  const isDirty = useMemo(() => {
    return cleanDisplayName !== status.displayName || cleanDescription !== (status.description ?? "") || color !== (status.color ?? "#f97316");
  }, [cleanDescription, cleanDisplayName, color, status.color, status.description, status.displayName]);

  async function handleSave() {
    if (isDefault || isSaving || isInvalidName || !isDirty) {
      return;
    }

    setIsSaving(true);

    try {
      await updateStatus({
        id: status._id,
        displayName: cleanDisplayName,
        description: cleanDescription.length > 0 ? cleanDescription : undefined,
        color,
      });
      toast.success("Status updated");
    } catch (error) {
      console.error(error);
      toast.error("Unable to update the status");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (isDefault || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await removeStatus({ id: status._id });
      setIsDeleteDialogOpen(false);
      toast.success("Status removed");
    } catch (error) {
      console.error(error);
      toast.error("Unable to remove the status");
    } finally {
      setIsDeleting(false);
    }
  }

  function resetDraft() {
    setDisplayName(status.displayName);
    setDescription(status.description ?? "");
    setColor(status.color ?? "#f97316");
  }

  if (isDefault) {
    return (
      <Card size="sm" className="border-border/70 bg-muted/20">
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-sm font-medium">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {status.displayName}
                </span>
                <Badge variant="secondary">{requestCount} requests</Badge>
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Lock className="size-3" />
                  Locked default
                </Badge>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {status.description ?? "This system status is shared across projects and cannot be renamed or removed here."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm" className="border-border/70 bg-background/60 backdrop-blur-sm">
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-sm font-medium">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                {previewName}
              </span>
              <Badge variant="secondary">{requestCount} requests</Badge>
              <Badge variant="outline">{isDefault ? "Default" : "Custom"}</Badge>
              {isDefault ? (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Lock className="size-3" />
                  Locked
                </Badge>
              ) : null}
            </div>

            <p className="max-w-2xl text-sm text-muted-foreground">
              {isDefault
                ? status.description ?? "This system status is shared and read-only inside project settings."
                : "Custom statuses can be renamed, recolored, described, and reordered for this project."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!canMoveUp || isReordering} onClick={() => void onMoveUp?.()}>
              <ArrowUp className="size-4" />
              Up
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!canMoveDown || isReordering} onClick={() => void onMoveDown?.()}>
              <ArrowDown className="size-4" />
              Down
            </Button>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={requestCount > 0 || isDeleting}>
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {status.displayName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the custom status permanently. Deletion is only allowed when no requests still reference it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(event) => {
                      event.preventDefault();
                      void handleDelete();
                    }}
                  >
                    {isDeleting ? "Deleting..." : "Delete status"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px]">
          <div className="grid gap-2">
            <Label htmlFor={`status-name-${status._id}`}>Display name</Label>
            <Input
              id={`status-name-${status._id}`}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              disabled={isDefault}
              aria-invalid={!isDefault && isInvalidName}
              placeholder="In review"
            />
            {!isDefault && isInvalidName ? (
              <p className="text-xs text-destructive">Use at least 2 readable characters.</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`status-color-${status._id}`}>Color</Label>
            <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
              <input
                id={`status-color-${status._id}`}
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                disabled={isDefault}
                className="h-9 w-11 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
              />
              <span className="font-mono text-xs text-muted-foreground">{color.toLowerCase()}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`status-description-${status._id}`}>Description</Label>
          <Textarea
            id={`status-description-${status._id}`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isDefault}
            placeholder="Explain when requests should move into this status."
          />
        </div>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {requestCount > 0 ? "Delete is disabled while requests still use this status." : "Unused custom statuses can be deleted."}
          </p>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" disabled={!isDirty || isSaving} onClick={resetDraft}>
              Reset
            </Button>
            <Button type="button" disabled={!isDirty || isSaving || isInvalidName} onClick={() => void handleSave()}>
              <Save className="size-4" />
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
