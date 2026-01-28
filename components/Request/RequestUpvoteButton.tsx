"use client";

import { useMutation } from "convex/react";
import { ChevronUp } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface Props {
  requestId: Id<"requests">;
  projectId: Id<"projects">;
  upvoteCount: number;
  isUpvoted: boolean;
  clientId?: string;
  size?: "sm" | "default";
}

export default function RequestUpvoteButton({
  requestId,
  projectId,
  upvoteCount,
  isUpvoted,
  clientId,
  size = "sm",
}: Props) {
  const toggleUpvote = useMutation(api.requestUpvotes.toggle);
  const [optimistic, setOptimistic] = useState<{
    upvoteCount: number;
    isUpvoted: boolean;
  } | null>(null);

  useEffect(() => {
    setOptimistic(null);
  }, [isUpvoted, upvoteCount]);

  const state = optimistic ?? { upvoteCount, isUpvoted };

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const next = {
      isUpvoted: !state.isUpvoted,
      upvoteCount: Math.max(0, state.upvoteCount + (state.isUpvoted ? -1 : 1)),
    };
    setOptimistic(next);

    try {
      const result = await toggleUpvote({ requestId, projectId, clientId });
      setOptimistic({ isUpvoted: result.upvoted, upvoteCount: result.upvoteCount });
    } catch (error) {
      console.error(error);
      setOptimistic(null);
      toast.error("Unable to update upvote right now.");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn(
        "gap-1 text-xs",
        state.isUpvoted ? "text-accent-foreground" : "text-muted-foreground",
      )}
      aria-pressed={state.isUpvoted}
      onClick={handleClick}
    >
      <ChevronUp
        className={cn(
          "h-4 w-4",
          state.isUpvoted ? "text-accent-foreground" : "text-muted-foreground",
        )}
      />
      <span>{state.upvoteCount}</span>
    </Button>
  );
}
