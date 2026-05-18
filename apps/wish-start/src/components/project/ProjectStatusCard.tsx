"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Save, Trash2 } from "lucide-react";
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
  const [displayName, setDisplayName] = useState(status.displayName);
  const [description, setDescription] = useState(status.description ?? "");
  const [color, setColor] = useState(status.color ?? "#f97316");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [replacementStatusId, setReplacementStatusId] = useState<Id<"requestStatuses"> | undefined>();

  useEffect(() => {
    setDisplayName(status.displayName);
    setDescription(status.description ?? "");
    setColor(status.color ?? "#f97316");
    setIsDeleteDialogOpen(false);
    setReplacementStatusId(undefined);
  }, [status._id, status.color, status.description, status.displayName]);

  const cleanDisplayName = displayName.trim();
  const cleanDescription = description.trim();
  const previewName = cleanDisplayName.length > 0 ? cleanDisplayName : status.displayName;
  const isInvalidName = cleanDisplayName.length < 2 || !slugifyStatusName(cleanDisplayName);
  const isDirty = useMemo(() => {
    return cleanDisplayName !== status.displayName || cleanDescription !== (status.description ?? "") || color !== (status.color ?? "#f97316");
  }, [cleanDescription, cleanDisplayName, color, status.color, status.description, status.displayName]);

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
        replacementStatusId,
      });
      setIsDeleteDialogOpen(false);
      setReplacementStatusId(undefined);
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
            </div>

            <p className="max-w-2xl text-sm text-muted-foreground">
              Project workflow statuses can be renamed, recolored, described, and reordered.
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

            <AlertDialog
              open={isDeleteDialogOpen}
              onOpenChange={(open) => {
                setIsDeleteDialogOpen(open);
                if (!open) {
                  setReplacementStatusId(undefined);
                }
              }}
            >
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={isDeleting || isLastStatus}>
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {status.displayName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isLastStatus
                      ? "This project must keep at least one status."
                      : requestCount > 0
                      ? "Requests in this status will move to a replacement status before the workflow status is deleted."
                      : "This removes the workflow status permanently. Unused statuses can be deleted directly as long as the project keeps another status."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {requestCount > 0 ? (
                  <div className="grid gap-2">
                    <Label htmlFor={`status-replacement-${status._id}`}>Replacement status</Label>
                    <Select
                      value={replacementStatusId ?? ""}
                      onValueChange={(value) => setReplacementStatusId(value as Id<"requestStatuses">)}
                    >
                      <SelectTrigger id={`status-replacement-${status._id}`}>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        {replacementCandidates
                          .filter((candidate) => candidate._id !== status._id)
                          .map((candidate) => (
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px]">
          <div className="grid gap-2">
            <Label htmlFor={`status-name-${status._id}`}>Display name</Label>
            <Input
              id={`status-name-${status._id}`}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              aria-invalid={isInvalidName}
              placeholder="In review"
            />
            {isInvalidName ? (
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
            placeholder="Explain when requests should move into this status."
          />
        </div>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {isLastStatus
              ? "This project needs at least one status."
              : requestCount > 0
                ? "Choose a replacement status to remove this one."
                : "Unused project statuses can be deleted."}
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
