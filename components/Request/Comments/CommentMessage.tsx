"use client";

import { Badge } from "@/components/ui/badge";
import type { Doc } from "@/convex/_generated/dataModel";

export default function CommentMessage({
  authorType,
  authorClientId,
  requestClientId,
  comments,
}: {
  authorType: Doc<"requestComments">["authorType"];
  authorClientId?: string;
  requestClientId: string;
  comments: Doc<"requestComments">[];
}) {
  const isAuthorClient = authorType === "client" && authorClientId === requestClientId;
  const label = authorType === "developer" ? "Developer" : "Client";
  const identifier = isAuthorClient ? authorClientId : null;

  return (
    <div className="flex flex-col py-2">
      <div className="flex flex-col">
        {comments.map((comment, index) => (
          <div key={comment._id} className="my-px">
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
            <p className={index === 0 ? "mt-2 text-sm text-foreground/90" : "text-sm text-foreground/90"}>
              {comment.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
