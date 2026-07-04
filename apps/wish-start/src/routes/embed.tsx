import { createFileRoute } from "@tanstack/react-router";
import { ArrowBigUp, ArrowLeft, MessageCircle, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getConvexHttpBaseUrl } from "@/lib/convexHttp";
import {
  createEmbedComment,
  createEmbedRequest,
  listEmbedComments,
  listEmbedRequests,
  listEmbedUpvotedRequestIds,
  toggleEmbedUpvote,
  type EmbedApiConfig,
  type EmbedComment,
  type EmbedRequest,
} from "@/lib/embedApi";
import { formatDate } from "@/lib/time";
import env from "@/env";

export const Route = createFileRoute("/embed")({
  head: () => ({
    meta: [
      { title: "Feedback - Wish" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (search) => ({
    projectId: typeof search.projectId === "string" ? search.projectId : undefined,
    clientId: typeof search.clientId === "string" ? search.clientId : undefined,
    clientKey: typeof search.clientKey === "string" ? search.clientKey : undefined,
  }),
  component: EmbedPage,
});

type EmbedScreen =
  | { name: "list" }
  | { name: "new" }
  | { name: "detail"; requestId: string };

function EmbedPage() {
  const { projectId, clientId, clientKey } = Route.useSearch();
  const baseUrl = getConvexHttpBaseUrl(env.VITE_CONVEX_URL);
  const config = useMemo(
    () =>
      projectId && clientId && clientKey && baseUrl
        ? { baseUrl, projectId, clientId, clientKey }
        : null,
    [baseUrl, projectId, clientId, clientKey],
  );

  if (!config) {
    return (
      <EmbedShell>
        <EmbedNotice
          title="Feedback is unavailable"
          description="This embed is missing its configuration. Check the appId, clientKey, and externalUserId passed to Wish.configure."
        />
      </EmbedShell>
    );
  }

  return <EmbedRequestsApp config={config} />;
}

function EmbedRequestsApp({ config }: { config: EmbedApiConfig }) {
  const [requests, setRequests] = useState<EmbedRequest[] | undefined>();
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [screen, setScreen] = useState<EmbedScreen>({ name: "list" });

  const load = useCallback(async () => {
    setLoadError(null);
    setRequests(undefined);
    try {
      const [nextRequests, nextUpvoted] = await Promise.all([
        listEmbedRequests(config),
        listEmbedUpvotedRequestIds(config),
      ]);
      nextRequests.sort((a, b) => b._creationTime - a._creationTime);
      setRequests(nextRequests);
      setUpvoted(nextUpvoted);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Something went wrong.");
    }
  }, [config]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpvote(requestId: string) {
    const wasUpvoted = upvoted.has(requestId);
    setUpvoted((current) => {
      const next = new Set(current);
      if (wasUpvoted) next.delete(requestId);
      else next.add(requestId);
      return next;
    });
    setRequests((current) =>
      current?.map((request) =>
        request._id === requestId
          ? { ...request, upvoteCount: Math.max(0, (request.upvoteCount ?? 0) + (wasUpvoted ? -1 : 1)) }
          : request,
      ),
    );

    try {
      await toggleEmbedUpvote(config, requestId);
    } catch {
      void load();
    }
  }

  if (loadError) {
    return (
      <EmbedShell>
        <EmbedNotice title="Could not load feedback" description={loadError}>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </EmbedNotice>
      </EmbedShell>
    );
  }

  if (requests === undefined) {
    return (
      <EmbedShell>
        <div className="flex justify-center py-16">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      </EmbedShell>
    );
  }

  if (screen.name === "new") {
    return (
      <EmbedShell>
        <EmbedNewRequest
          config={config}
          onBack={() => setScreen({ name: "list" })}
          onCreated={() => {
            setScreen({ name: "list" });
            void load();
          }}
        />
      </EmbedShell>
    );
  }

  if (screen.name === "detail") {
    const request = requests.find((item) => item._id === screen.requestId);
    return (
      <EmbedShell>
        {request ? (
          <EmbedRequestDetail
            config={config}
            request={request}
            isUpvoted={upvoted.has(request._id)}
            onUpvote={() => void handleUpvote(request._id)}
            onBack={() => setScreen({ name: "list" })}
          />
        ) : (
          <EmbedNotice title="Request not found" description="This request is no longer available.">
            <Button type="button" variant="outline" size="sm" onClick={() => setScreen({ name: "list" })}>
              Back to requests
            </Button>
          </EmbedNotice>
        )}
      </EmbedShell>
    );
  }

  return (
    <EmbedShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Feature requests</h1>
        <Button type="button" size="sm" onClick={() => setScreen({ name: "new" })}>
          <Plus />
          New request
        </Button>
      </div>

      <Separator className="my-4" />

      {requests.length === 0 ? (
        <EmbedNotice
          title="No requests yet"
          description="Be the first to suggest an improvement."
        >
          <Button type="button" size="sm" onClick={() => setScreen({ name: "new" })}>
            <Plus />
            New request
          </Button>
        </EmbedNotice>
      ) : (
        <div className="space-y-2">
          {requests.map((request) => (
            <article key={request._id} className="flex gap-3 rounded-lg border bg-card p-3">
              <UpvoteButton
                upvoteCount={request.upvoteCount ?? 0}
                isUpvoted={upvoted.has(request._id)}
                onClick={() => void handleUpvote(request._id)}
              />
              <button
                type="button"
                className="min-w-0 flex-1 space-y-1 text-left"
                onClick={() => setScreen({ name: "detail", requestId: request._id })}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {request.computedStatus ? (
                    <Badge variant="secondary">{request.computedStatus.displayName}</Badge>
                  ) : null}
                  <time className="text-xs text-muted-foreground">{formatDate(request._creationTime)}</time>
                </div>
                <h2 className="text-sm font-semibold tracking-tight">{request.text}</h2>
                {request.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{request.description}</p>
                ) : null}
              </button>
            </article>
          ))}
        </div>
      )}
    </EmbedShell>
  );
}

function EmbedRequestDetail({
  config,
  request,
  isUpvoted,
  onUpvote,
  onBack,
}: {
  config: EmbedApiConfig;
  request: EmbedRequest;
  isUpvoted: boolean;
  onUpvote: () => void;
  onBack: () => void;
}) {
  const [comments, setComments] = useState<EmbedComment[] | undefined>();
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setCommentsError(null);
    setComments(undefined);
    try {
      setComments(await listEmbedComments(config, request._id));
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : "Something went wrong.");
    }
  }, [config, request._id]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentText.trim();
    if (!body || isSending) {
      return;
    }

    setIsSending(true);
    setSendError(null);
    try {
      await createEmbedComment(config, request._id, body);
      setCommentText("");
      await loadComments();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Could not post the comment.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft />
        Back
      </Button>

      <div className="flex gap-3">
        <UpvoteButton upvoteCount={request.upvoteCount ?? 0} isUpvoted={isUpvoted} onClick={onUpvote} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {request.computedStatus ? (
              <Badge variant="secondary">{request.computedStatus.displayName}</Badge>
            ) : null}
            <time className="text-xs text-muted-foreground">{formatDate(request._creationTime)}</time>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">{request.text}</h1>
          {request.description ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{request.description}</p>
          ) : null}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <MessageCircle className="size-4" />
          Comments
        </h2>

        {commentsError ? (
          <EmbedNotice title="Could not load comments" description={commentsError}>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadComments()}>
              Retry
            </Button>
          </EmbedNotice>
        ) : comments === undefined ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => (
              <div key={comment._id} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">
                    {comment.authorType === "developer" ? "Team" : "User"}
                  </span>
                  <time>{formatDate(comment.createdAt)}</time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
              </div>
            ))}
          </div>
        )}

        <form className="space-y-2" onSubmit={submitComment}>
          <Textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Add a comment"
            maxLength={1000}
            rows={3}
          />
          {sendError ? <p className="text-sm text-destructive">{sendError}</p> : null}
          <Button type="submit" size="sm" disabled={isSending || !commentText.trim()}>
            {isSending ? <Spinner /> : null}
            Comment
          </Button>
        </form>
      </div>
    </div>
  );
}

function EmbedNewRequest({
  config,
  onBack,
  onCreated,
}: {
  config: EmbedApiConfig;
  onBack: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = title.trim();
    if (text.length < 3 || isSending) {
      return;
    }

    setIsSending(true);
    setSendError(null);
    try {
      await createEmbedRequest(config, { text, description });
      onCreated();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Could not submit the request.");
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft />
        Back
      </Button>

      <h1 className="text-lg font-semibold tracking-tight">New request</h1>

      <form className="space-y-3" onSubmit={submit}>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What would you like to see?"
          required
          minLength={3}
        />
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add more details (optional)"
          rows={4}
        />
        {sendError ? <p className="text-sm text-destructive">{sendError}</p> : null}
        <Button type="submit" disabled={isSending || title.trim().length < 3}>
          {isSending ? <Spinner /> : null}
          Submit request
        </Button>
      </form>
    </div>
  );
}

function UpvoteButton({
  upvoteCount,
  isUpvoted,
  onClick,
}: {
  upvoteCount: number;
  isUpvoted: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={isUpvoted ? "default" : "outline"}
      className="h-10 shrink-0 gap-1.5 px-3"
      aria-pressed={isUpvoted}
      onClick={onClick}
    >
      <ArrowBigUp className="size-4" />
      <span>{upvoteCount}</span>
    </Button>
  );
}

function EmbedShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl px-4 py-5">{children}</div>
    </main>
  );
}

function EmbedNotice({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
