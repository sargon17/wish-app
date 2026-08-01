import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";
import { useMutation } from "convex/react";
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
import { normalizePortalDateRange } from "@/lib/portalDateRange";
import { normalizePortalSort } from "@/lib/portalSort";
import { formatDate } from "@/lib/time";

export const Route = createFileRoute("/p/$projectSlug/r/$requestId/$requestSlug")({
  head: () => ({
    meta: [
      { title: "Request - Wish" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Read and discuss a product suggestion." },
    ],
  }),
  validateSearch: (search) => {
    const dates = normalizePortalDateRange(search.from, search.to);
    return {
      q: typeof search.q === "string" ? search.q : undefined,
      statuses: typeof search.statuses === "string" ? search.statuses : undefined,
      ...dates,
      sort: normalizePortalSort(search.sort),
    };
  },
  component: PublicRequestDetailPage,
});

function PublicRequestDetailPage() {
  const { projectSlug, requestId } = Route.useParams();
  const searchParams = Route.useSearch();
  const clientId = useRequesterIdentity();
  const deleteComment = useMutation(api.suggestionPortals.deleteComment);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const { data: detail, error } = useQuery(
    convexQuery(api.suggestionPortals.getPublishedRequest, {
      projectSlug,
      requestId,
      clientId: clientId ?? undefined,
    }),
  );

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

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="max-w-md border-y py-6 text-center">
          <h1 className="text-lg font-semibold">Could not load this request</h1>
          <p className="mt-2 text-sm text-muted-foreground">Refresh the page to try again.</p>
          <Button className="mt-4" size="sm" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </main>
    );
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
    <main className="min-h-screen bg-muted/30 text-foreground">
      <div className="w-full px-4 py-4 sm:px-6 md:py-6 lg:px-8 2xl:px-12">
        <Button variant="ghost" size="sm" className="mb-3 -ml-3 text-muted-foreground" asChild>
          <Link to="/p/$projectSlug" params={{ projectSlug }} search={searchParams}>
            <ArrowLeft />
            Back to {detail.project.title}
          </Link>
        </Button>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12 xl:gap-16">
          <div>
            <article className="border-y py-6 md:py-8">
              <div className="flex flex-wrap items-center gap-2">
                {detail.status ? (
                  <Badge variant="secondary">{detail.status.displayName}</Badge>
                ) : null}
                <time className="text-sm text-muted-foreground">
                  {formatDate(detail.request._creationTime)}
                </time>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-3xl">
                {detail.request.text}
              </h1>
              {detail.request.description ? (
                <div className="mt-5 border-t pt-5 text-sm leading-7 whitespace-pre-wrap text-foreground/80 sm:text-base">
                  {detail.request.description}
                </div>
              ) : null}
            </article>

            <section className="mt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">Discussion</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {detail.comments.length} {detail.comments.length === 1 ? "comment" : "comments"}
                </span>
              </div>

              <PublicCommentForm projectSlug={projectSlug} requestId={detail.request._id} />

              <Separator className="my-5" />

              <div className="space-y-3">
                {detail.comments.length === 0 ? (
                  <p className="border-y border-dashed bg-muted/30 px-2 py-5 text-sm text-muted-foreground">
                    No comments yet. Start the conversation with useful context.
                  </p>
                ) : (
                  detail.comments.map((comment) => (
                    <div key={comment._id} className="border-b px-1 py-4 last:border-b-0">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={comment.authorType === "developer" ? "default" : "outline"}
                          >
                            {comment.authorType === "developer" ? "Project Owner" : "Requester"}
                          </Badge>
                          <time className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </time>
                        </div>
                        {clientId &&
                        comment.authorType === "client" &&
                        comment.authorClientId === clientId ? (
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
                      <p className="text-sm leading-7 whitespace-pre-wrap text-foreground/80">
                        {comment.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="order-first mt-6 border-t pt-5 lg:order-last lg:mt-0 lg:border-t-0 lg:border-l lg:pl-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Support this request
            </p>
            <PublicUpvoteButton
              projectSlug={projectSlug}
              requestId={detail.request._id}
              upvoteCount={detail.request.upvoteCount ?? 0}
              isUpvoted={detail.request.isUpvoted}
              className="mt-3 h-10 w-full justify-start rounded-lg px-3"
            />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Your vote helps the team understand which ideas matter most.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
