import { Button } from "@components/ui/button";
import type { Doc, Id } from "@wish/convex-backend/data-model";
import { Trash2, X } from "lucide-react";
import { useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RequestBulkActions({
  count,
  isPending,
  kind,
  onClear,
  onDelete,
  onStatusChange,
  statuses,
}: {
  count: number;
  isPending: boolean;
  kind: "request" | "complaint";
  onClear: () => void;
  onDelete: () => Promise<boolean>;
  onStatusChange: (status: Id<"requestStatuses">) => Promise<void>;
  statuses: Doc<"requestStatuses">[];
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const handleDelete = async () => {
    if (await onDelete()) setIsDeleteOpen(false);
  };

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-40 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-in flex-wrap items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/95 p-2 shadow-xl fade-in-0 slide-in-from-bottom-2 duration-150 motion-reduce:animate-none dark:border-orange-900 dark:bg-orange-950/95"
    >
      <span className="mr-auto px-1 text-sm font-medium">
        {count} {kind}
        {count === 1 ? "" : "s"} selected
      </span>

      <Select
        disabled={isPending}
        onValueChange={(statusId) => {
          const status = statuses.find((item) => item._id === statusId);
          if (status) void onStatusChange(status._id);
        }}
        value=""
      >
        <SelectTrigger size="sm" aria-label="Change status">
          <SelectValue placeholder="Change status" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((status) => (
            <SelectItem key={status._id} value={status._id}>
              {status.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogTrigger asChild>
          <Button type="button" size="sm" variant="destructive" disabled={isPending}>
            <Trash2 />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {count} {kind}
              {count === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the selected {kind}
              {count === 1 ? "" : "s"}, including their comments and upvotes. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={onClear}>
        <X />
        Clear selection
      </Button>
    </div>
  );
}
