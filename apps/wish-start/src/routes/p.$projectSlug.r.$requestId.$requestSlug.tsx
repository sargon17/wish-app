import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, MessageCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PublicCommentForm } from "@/components/portal/PublicCommentForm";
import { PublicUpvoteButton } from "@/components/portal/PublicUpvoteButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useRequesterIdentity } from "@/hooks/useRequesterIdentity";
import { normalizePortalSort } from "@/lib/portalSort";
import { formatDate } from "@/lib/time";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

export const Route = createFileRoute("/p/$projectSlug/r/$requestId/$requestSlug")({
  head: () => ({
    meta: [
      { title: "Request - Wish" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Read and discuss a product suggestion." },
    ],
  }),
  validateSearch: (search) => ({
    q: typeof search.q === "string" ? search.q : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
    sort: normalizePortalSort(search.sort),
  }),
  component: PublicRequestDetailPage,
});

function PublicRequestDetailPage() {
  const { projectSlug, requestId } = Route.useParams();
  const searchParams = Route.useSearch();
  const clientId = useRequesterIdentity();
  const deleteComment = useMutation(api.suggestionPortals.deleteComment);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const detail = useQuery(api.suggestionPortals.getPublishedRequest, {
    projectSlug,
    requestId,
    clientId: clientId ?? undefined,
  });

  async function handleDeleteComment(commentId: Id<"requestComments">) {
    if (!clientId || !detail) {
      toast.error("Unable to prepare requester identity");
      return;
    }

    setDeletingCommentId(commentId);
    try {
      await deleteComment({
        projectSlug,
        requestId: detail.request._id,
        commentId,
        clientId,
      });
      toast.success("Comment deleted");
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  }

  if (detail === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="size-6 text-muted-foreground" />
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="max-w-md rounded-lg border bg-card p-6">
          <h1 className="text-xl font-semibold">Request not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This request does not exist or the portal is not published.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-12">
        <Button variant="ghost" className="-ml-3 mb-6" asChild>
          <Link to="/p/$projectSlug" params={{ projectSlug }} search={searchParams}>
            <ArrowLeft />
            Back to {detail.project.title}
          </Link>
        </Button>

        <article className="space-y-6">
          <div className="flex gap-4">
            <PublicUpvoteButton
              projectSlug={projectSlug}
              requestId={detail.request._id}
              upvoteCount={detail.request.upvoteCount ?? 0}
              isUpvoted={detail.request.isUpvoted}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {detail.status ? <Badge variant="secondary">{detail.status.displayName}</Badge> : null}
                <time className="text-sm text-muted-foreground">{formatDate(detail.request._creationTime)}</time>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {detail.request.text}
              </h1>
              {detail.request.description ? (
                <p className="whitespace-pre-wrap text-base leading-7 text-muted-foreground">
                  {detail.request.description}
                </p>
              ) : null}
            </div>
          </div>
        </article>

        <Separator className="my-8" />

        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Comments</h2>
          </div>

          <PublicCommentForm projectSlug={projectSlug} requestId={detail.request._id} />

          <div className="space-y-3">
            {detail.comments.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No comments yet.
              </p>
            ) : (
              detail.comments.map((comment) => (
                <div key={comment._id} className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={comment.authorType === "developer" ? "default" : "outline"}>
                        {comment.authorType === "developer" ? "Project Owner" : "Requester"}
                      </Badge>
                      <time className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</time>
                    </div>
                    {clientId && comment.authorType === "client" && comment.authorClientId === clientId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        disabled={deletingCommentId === comment._id}
                        aria-label="Delete comment"
                        onClick={() => void handleDeleteComment(comment._id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
