"use client";
import { api } from "@wish/convex-backend/api";
import type { Doc } from "@wish/convex-backend/data-model";
import { useMutation } from "convex/react";
import { Ellipsis, MoveRight } from "lucide-react";
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

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import RequestCreateEditDialog from "./RequestCreateEditDialog";

interface Props {
  request: Doc<"requests">;
  statuses?: Doc<"requestStatuses">[];
  alwaysVisible?: boolean;
  label?: string;
}
export default function RequestCardActions({
  request,
  statuses,
  alwaysVisible = false,
  label = "Request",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const deleteProject = useMutation(api.requests.deleteRequest);
  const updateStatus = useMutation(api.requests.updateStatus);

  async function moveToStatus(status: Doc<"requestStatuses">) {
    if (status._id === request.status) return;

    try {
      await updateStatus({ id: request._id, status: status._id });
      toast.success(`Request moved to ${status.displayName}`);
    } catch (error) {
      console.error(error);
      toast.error("Unable to move the request");
    }
  }

  const handleSubmit = () => {
    deleteProject({ id: request._id });
    setIsOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="relative z-10" asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${label} actions`}
            className={alwaysVisible ? undefined : "opacity-100"}
          >
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statuses && statuses.length > 0 ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <MoveRight />
                Move to Status
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {statuses.map((status) => (
                    <DropdownMenuItem
                      key={status._id}
                      disabled={status._id === request.status}
                      onSelect={() => void moveToStatus(status)}
                    >
                      {status.displayName}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ) : null}
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
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive">
                Delete
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
