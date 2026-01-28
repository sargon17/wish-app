"use client";

import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Doc } from "@/convex/_generated/dataModel";

export default function CommentMessage({
  authorType,
  authorClientId,
  requestClientId,
  comments,
  onDelete,
}: {
  authorType: Doc<"requestComments">["authorType"];
  authorClientId?: string;
  requestClientId: string;
  comments: Doc<"requestComments">[];
  onDelete: (id: Doc<"requestComments">["_id"]) => Promise<void>;
}) {
  const isAuthorClient = authorType === "client" && authorClientId === requestClientId;
  const label = authorType === "developer" ? "Developer" : "Client";
  const identifier = isAuthorClient ? authorClientId : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col">
        {comments.map((comment, index) => (
          <div key={comment._id}>
            {index === 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {label}
                </Badge>
                {identifier && <span className="text-xs text-muted-foreground">{identifier}</span>}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(comment.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={
                    index === 0
                      ? "mt-2 w-full rounded-md px-2 py-1 text-left text-sm text-foreground/90 transition-colors hover:bg-accent/20"
                      : "w-full rounded-md px-2 py-1 text-left text-sm text-foreground/90 transition-colors hover:bg-accent/20"
                  }
                >
                  {comment.body}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => onDelete(comment._id)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
