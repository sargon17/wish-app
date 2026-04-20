"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import type { PropsWithChildren } from "react";
import { PaintBucket, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugifyStatusName } from "@/lib/requestStatus/slugifyStatusName";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

type StatusCreationViewProps = PropsWithChildren<{
  projectId: Id<"projects">;
  defaultColor?: string;
}>;

const DEFAULT_COLOR = "#f97316";

export default function StatusCreationView({
  children,
  projectId,
  defaultColor = DEFAULT_COLOR,
}: StatusCreationViewProps) {
  const createStatus = useMutation(api.requestStatuses.create);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [isCreating, setIsCreating] = useState(false);

  const cleanName = name.trim();
  const slug = slugifyStatusName(cleanName);
  const isInvalidName = cleanName.length < 2 || !slug;

  function resetForm() {
    setName("");
    setDescription("");
    setColor(defaultColor);
    setIsCreating(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      resetForm();
    }
  }

  async function handleCreateStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isInvalidName) {
      toast.error("Add a valid status name");
      return;
    }

    setIsCreating(true);

    try {
      await createStatus({
        displayName: cleanName,
        description: description.trim() || undefined,
        project: projectId,
        color,
      });
      resetForm();
      setOpen(false);
      toast.success("Status added");
    } catch (error) {
      console.error(error);
      toast.error("Unable to add the status");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a new status</DialogTitle>
          <DialogDescription>
            Add a custom workflow stage for this project. It will appear after the default statuses.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleCreateStatus}>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
            <div className="grid gap-2">
              <Label htmlFor="status-name">Status name</Label>
              <Input
                id="status-name"
                placeholder="In review"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={isInvalidName && cleanName.length > 0}
              />
              <p className="text-xs text-muted-foreground">Used in the board, filters, and request editor.</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status-color">Color</Label>
              <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
                <input
                  id="status-color"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-9 w-11 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <PaintBucket className="size-3.5" />
                  {color.toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status-description">Description</Label>
            <Textarea
              id="status-description"
              placeholder="Explain when this stage should be used."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || isInvalidName}>
              <Plus className="size-4" />
              {isCreating ? "Adding..." : "Add status"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
