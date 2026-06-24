"use client";

import { useMutation } from "convex/react";
import { Send } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRequesterIdentity } from "@/hooks/useRequesterIdentity";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

export function PublicCommentForm({
  projectSlug,
  requestId,
}: {
  projectSlug: string;
  requestId: Id<"requests">;
}) {
  const clientId = useRequesterIdentity();
  const createComment = useMutation(api.suggestionPortals.createComment);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedBody = body.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!clientId) {
      toast.error("Unable to prepare requester identity");
      return;
    }

    if (!trimmedBody) {
      toast.error("Comment cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      await createComment({ projectSlug, requestId, clientId, body: trimmedBody });
      setBody("");
      toast.success("Comment posted");
    } catch (error) {
      console.error(error);
      toast.error("Unable to post comment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Textarea
        value={body}
        maxLength={1000}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Add context, a use case, or a follow-up question."
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !clientId || !trimmedBody}>
          <Send />
          {isSubmitting ? "Posting..." : "Post comment"}
        </Button>
      </div>
    </form>
  );
}
