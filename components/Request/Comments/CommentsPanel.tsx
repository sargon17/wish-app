"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowUp, MessageSquareText } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

import CommentsList from "./CommentsList";

export default function CommentsPanel({ request }: { request: Doc<"requests"> }) {
  const createComment = useMutation(api.requestComments.create);
  const comments = useQuery(api.requestComments.listByRequest, {
    requestId: request._id,
  });
  const [commentBody, setCommentBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCommentBody("");
  }, [request._id]);

  const commentCount = comments?.length ?? 0;

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const body = commentBody.trim();
    if (!body) {
      toast.error("Add a comment first.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createComment({
        requestId: request._id,
        projectId: request.project,
        body,
      });
      setCommentBody("");
    } catch (error) {
      console.error(error);
      toast.error("Unable to add comment right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Comments</p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {commentCount}
        </Badge>
      </div>

      <Separator className="my-3" />

      <CommentsList comments={comments} request={request} />

      <Separator className="my-3" />

      <form className="mt-auto" onSubmit={handleCommentSubmit}>
        <InputGroup>
          <InputGroupTextarea
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder="Leave a comment..."
            className="py-2 text-sm"
          />
          <InputGroupAddon align="block-end" className="justify-end border-t">
            <InputGroupButton
              type="submit"
              size="icon-sm"
              disabled={isSubmitting}
              aria-label="Send comment"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </form>
    </div>
  );
}
