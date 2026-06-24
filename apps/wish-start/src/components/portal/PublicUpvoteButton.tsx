"use client";

import { useMutation } from "convex/react";
import { ArrowBigUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useRequesterIdentity } from "@/hooks/useRequesterIdentity";
import { cn } from "@/lib/utils";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

export function PublicUpvoteButton({
  projectSlug,
  requestId,
  upvoteCount,
  isUpvoted,
  className,
}: {
  projectSlug: string;
  requestId: Id<"requests">;
  upvoteCount: number;
  isUpvoted: boolean;
  className?: string;
}) {
  const clientId = useRequesterIdentity();
  const toggleUpvote = useMutation(api.suggestionPortals.toggleUpvote);
  const [optimistic, setOptimistic] = useState<{
    upvoteCount: number;
    isUpvoted: boolean;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const state = optimistic ?? { upvoteCount, isUpvoted };

  useEffect(() => {
    setOptimistic(null);
  }, [isUpvoted, upvoteCount]);

  async function handleUpvote() {
    if (!clientId) {
      toast.error("Unable to prepare requester identity");
      return;
    }

    setOptimistic({
      isUpvoted: !state.isUpvoted,
      upvoteCount: Math.max(0, state.upvoteCount + (state.isUpvoted ? -1 : 1)),
    });
    setIsSaving(true);
    try {
      const result = await toggleUpvote({ projectSlug, requestId, clientId });
      setOptimistic({ isUpvoted: result.upvoted, upvoteCount: result.upvoteCount });
    } catch (error) {
      console.error(error);
      setOptimistic(null);
      toast.error("Unable to update vote");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Button
      type="button"
      variant={state.isUpvoted ? "default" : "outline"}
      className={cn("h-10 gap-1.5 px-3", className)}
      disabled={isSaving || !clientId}
      aria-pressed={state.isUpvoted}
      onClick={handleUpvote}
    >
      <ArrowBigUp className="size-4" />
      <span>{state.upvoteCount}</span>
    </Button>
  );
}
