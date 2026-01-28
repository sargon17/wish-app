"use client";

import { useCallback, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

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
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState(defaultColor);
  const [isCreating, setIsCreating] = useState(false);

  const fallbackColor = useMemo(() => defaultColor, [defaultColor]);

  const slugifyStatusName = useCallback((label: string) => {
    return label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }, []);

  const handleCreateStatus = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const displayName = newStatusName.trim();
      const name = slugifyStatusName(displayName);

      if (!displayName || !name) {
        toast.error("Add a name for the new status");
        return;
      }

      setIsCreating(true);
      try {
        await createStatus({
          name,
          displayName,
          project: projectId,
          color: newStatusColor,
        });
        setNewStatusName("");
        setNewStatusColor(fallbackColor);
        setOpen(false);
        toast.success("Status added");
      } catch (error) {
        console.error(error);
        toast.error("Unable to add the status");
      } finally {
        setIsCreating(false);
      }
    },
    [createStatus, fallbackColor, newStatusColor, newStatusName, projectId, slugifyStatusName],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[80vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a new status</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleCreateStatus}>
          <InputGroup>
            <InputGroupInput
              id="status-name"
              placeholder="Backlog"
              value={newStatusName}
              onChange={(event) => setNewStatusName(event.target.value)}
            />

            <Popover>
              <PopoverTrigger>
                <div className="w-4 h-4" style={{ backgroundColor: newStatusColor }}></div>
              </PopoverTrigger>
              <PopoverContent>
                <InputGroupInput
                  id="status-color"
                  type="color"
                  value={newStatusColor}
                  onChange={(event) => setNewStatusColor(event.target.value)}
                  className="h-10 w-10 p-1"
                />
              </PopoverContent>
            </Popover>
          </InputGroup>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !newStatusName.trim()}>
              {isCreating ? "Adding..." : "Add status"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
