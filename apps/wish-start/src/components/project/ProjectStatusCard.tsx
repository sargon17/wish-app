"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, PencilLine, Trash2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { slugifyStatusName } from "@/lib/requestStatus/slugifyStatusName";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

export default function ProjectStatusCard({
  status,
  replacementCandidates,
  requestCount,
  canMoveUp = false,
  canMoveDown = false,
  isLastStatus = false,
  isReordering = false,
  onMoveUp,
  onMoveDown,
}: {
  status: {
    _id: Id<"requestStatuses">;
    displayName: string;
    description?: string;
    color?: string | null;
  };
  replacementCandidates: {
    _id: Id<"requestStatuses">;
    displayName: string;
    color?: string | null;
  }[];
  requestCount: number;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isLastStatus?: boolean;
  isReordering?: boolean;
  onMoveUp?: () => Promise<void> | void;
  onMoveDown?: () => Promise<void> | void;
}) {
  const updateStatus = useMutation(api.requestStatuses.update);
  const removeStatus = useMutation(api.requestStatuses.remove);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [displayName, setDisplayName] = useState(status.displayName);
  const [description, setDescription] = useState(status.description ?? "");
  const [color, setColor] = useState(status.color ?? "#f97316");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replacementStatusId, setReplacementStatusId] = useState<Id<"requestStatuses"> | "">("");

  useEffect(() => {
    if (!isEditOpen) {
      setDisplayName(status.displayName);
      setDescription(status.description ?? "");
      setColor(status.color ?? "#f97316");
    }
  }, [isEditOpen, status.color, status.description, status.displayName]);

  useEffect(() => {
    if (!isDeleteDialogOpen) {
      setReplacementStatusId("");
    }
  }, [isDeleteDialogOpen]);

  const cleanDisplayName = displayName.trim();
  const cleanDescription = description.trim();
  const isInvalidName = cleanDisplayName.length < 2 || !slugifyStatusName(cleanDisplayName);
  const isDirty =
    cleanDisplayName !== status.displayName || cleanDescription !== (status.description ?? "") || color !== (status.color ?? "#f97316");
  const visibleDescription = status.description?.trim();
  const replacementOptions = replacementCandidates.filter((candidate) => candidate._id !== status._id);

  async function handleSave() {
    if (isSaving || isInvalidName || !isDirty) {
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
      setIsEditOpen(false);
      toast.success("Status updated");
    } catch (error) {
      console.error(error);
      toast.error("Unable to update the status");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (isDeleting || isLastStatus || (requestCount > 0 && !replacementStatusId)) {
      return;
    }

    setIsDeleting(true);

    try {
      await removeStatus({
        statusId: status._id,
        replacementStatusId: replacementStatusId || undefined,
      });
      setIsDeleteDialogOpen(false);
      toast.success("Status removed");
    } catch (error) {
      console.error(error);
      toast.error("Unable to remove the status");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-3 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-border/50"
            style={{ backgroundColor: status.color ?? "#f97316" }}
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-medium text-foreground">{status.displayName}</h4>
              {requestCount > 0 ? <Badge variant="secondary">{requestCount} requests</Badge> : null}
            </div>
            {visibleDescription ? <p className="line-clamp-1 text-xs text-muted-foreground">{visibleDescription}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="size-8" disabled={!canMoveUp || isReordering} onClick={() => void onMoveUp?.()}>
            <ArrowUp className="size-4" />
            <span className="sr-only">Move {status.displayName} up</span>
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-8" disabled={!canMoveDown || isReordering} onClick={() => void onMoveDown?.()}>
            <ArrowDown className="size-4" />
            <span className="sr-only">Move {status.displayName} down</span>
          </Button>

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <PencilLine className="size-4" />
                Edit status
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit status</DialogTitle>
                <DialogDescription>Update the name, description, and color for this project status.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor={`status-name-${status._id}`}>Display name</Label>
                  <Input
                    id={`status-name-${status._id}`}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    aria-invalid={isInvalidName}
                    placeholder="In review"
                  />
                  {isInvalidName ? <p className="text-xs text-destructive">Use at least 2 readable characters.</p> : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`status-description-${status._id}`}>Description</Label>
                  <Textarea
                    id={`status-description-${status._id}`}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Explain when requests should move into this status."
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`status-color-${status._id}`}>Color</Label>
                  <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
                    <input
                      id={`status-color-${status._id}`}
                      type="color"
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                      className="h-9 w-11 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
                    />
                    <span className="font-mono text-xs text-muted-foreground">{color.toLowerCase()}</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={!isDirty || isSaving || isInvalidName} onClick={() => void handleSave()}>
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => {
              setIsDeleteDialogOpen(open);
              if (!open) {
                setReplacementStatusId("");
              }
            }}
          >
            {isLastStatus ? (
              <div className="flex flex-col items-start gap-1">
                <Button type="button" variant="outline" size="sm" disabled title="This project must keep at least one status.">
                  <Trash2 className="size-4" />
                  Delete
                </Button>
                <p className="max-w-48 text-left text-xs text-muted-foreground">This project must keep at least one status.</p>
              </div>
            ) : (
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={isDeleting}>
                  <Trash2 className="size-4" />
                  Remove status
                </Button>
              </AlertDialogTrigger>
            )}
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {status.displayName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isLastStatus
                    ? "This project must keep at least one status, so the last remaining status cannot be deleted."
                    : requestCount > 0
                      ? "Requests in this status must be reassigned to another status before this status can be deleted."
                      : "This status will be permanently removed."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {requestCount > 0 ? (
                <div className="grid gap-2">
                  <Label htmlFor={`status-replacement-${status._id}`}>Move requests to</Label>
                  <Select
                    value={replacementStatusId}
                    onValueChange={(value) => setReplacementStatusId(value as Id<"requestStatuses"> | "")}
                  >
                    <SelectTrigger id={`status-replacement-${status._id}`}>
                      <SelectValue placeholder="Select another status" />
                    </SelectTrigger>
                    <SelectContent>
                      {replacementOptions.map((candidate) => (
                        <SelectItem key={candidate._id} value={candidate._id}>
                          <span className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: candidate.color ?? "#f97316" }} />
                            {candidate.displayName}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isLastStatus || (requestCount > 0 && !replacementStatusId)}
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
    </div>
  );
}
