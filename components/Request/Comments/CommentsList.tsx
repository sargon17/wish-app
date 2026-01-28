"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { Doc } from "@/convex/_generated/dataModel";

import CommentMessage from "./CommentMessage";

 
function getAuthorKey(comment: Doc<"requestComments">) {
  if (comment.authorType === "developer") {
    return `developer:${comment.authorUserId ?? "unknown"}`;
  }
  return `client:${comment.authorClientId ?? "unknown"}`;
}

export default function CommentsList({
  comments,
  request,
  onDelete,
}: {
  comments?: Doc<"requestComments">[];
  request: Doc<"requests">;
  onDelete: (id: Doc<"requestComments">["_id"]) => Promise<void>;
}) {
  if (!comments || comments.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">No comments yet. Start the conversation.</div>
    );
  }

  const groups = comments.reduce((acc, comment) => {
    const key = getAuthorKey(comment);
    const last = acc[acc.length - 1];
    if (last && getAuthorKey(last[0]) === key) {
      last.push(comment);
      return acc;
    }
    acc.push([comment]);
    return acc;
  }, [] as Doc<"requestComments">[][]);

  return (
    <ScrollArea className="max-h-72 pr-2 md:max-h-80">
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={`${getAuthorKey(group[0])}-${group[0]._id}`} className="flex flex-col gap-3">
            <CommentMessage
              authorType={group[0].authorType}
              authorClientId={group[0].authorClientId}
              requestClientId={request.clientId}
              comments={group}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
