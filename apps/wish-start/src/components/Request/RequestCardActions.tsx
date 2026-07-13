"use client";
import { api } from "@wish/convex-backend/api";
import type { Doc } from "@wish/convex-backend/data-model";
import { useMutation } from "convex/react";
import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getWorkTrackerError } from "@/lib/workTrackerErrors";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Spinner } from "../ui/spinner";

import RequestCreateEditDialog from "./RequestCreateEditDialog";

interface Props {
  request: Doc<"requests">;
  alwaysVisible?: boolean;
  label?: string;
}
export default function RequestCardActions({
  request,
  alwaysVisible = false,
  label = "Request",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteRequest = useMutation(api.requests.deleteRequest);

  const handleSubmit = async () => {
    setDeleting(true);
    try {
      await deleteRequest({ id: request._id });
      setIsOpen(false);
      toast.success(`${label} deleted`);
    } catch (error) {
      const workTrackerError = getWorkTrackerError(error);
      if (workTrackerError) {
        toast.error(`${label} cannot be deleted yet`, {
          description: workTrackerError.message,
        });
      } else {
        toast.error(`Could not delete ${label.toLowerCase()}`);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="relative z-10" asChild>
          <Button
            variant="ghost"
            size="icon"
            className={
              alwaysVisible
                ? undefined
                : "opacity-0 transition-all group-hover/request-card:opacity-100"
            }
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setIsEdit(true);
            }}
          >
            Edit
          </DropdownMenuItem>

          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setIsOpen(true);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RequestCreateEditDialog
        method="edit"
        request={request}
        project={request.project}
        open={isEdit}
        onOpenChange={setIsEdit}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form action={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Delete {label}</DialogTitle>
              <DialogDescription>This action is final and irreversible</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={deleting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={deleting}>
                {deleting ? <Spinner /> : null}
                {deleting ? "Deleting" : "Delete"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
