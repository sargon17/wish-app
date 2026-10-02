import { createFileRoute } from "@tanstack/react-router";
import { ArrowBigUp, ArrowLeft, MessageCircle, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ChangelogFeatureIcon } from "@/components/project/ChangelogFeatureIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useEmbedContentState } from "@/hooks/useEmbedContentState";
import { useEmbedResource } from "@/hooks/useEmbedResource";
import { getConvexHttpBaseUrl } from "@/lib/convexHttp";
import {
  createEmbedComment,
  createEmbedRequest,
  getEmbedChangelog,
  getEmbedWhatsNew,
  listEmbedComments,
  listEmbedRequests,
  listEmbedUpvotedRequestIds,
  toggleEmbedUpvote,
  type EmbedApiConfig,
  type EmbedChangelogEntry,
  type EmbedRequest,
} from "@/lib/embedApi";
import { formatDate } from "@/lib/time";

export const Route = createFileRoute("/embed")({
  head: () => ({
    meta: [{ title: "Feedback - Wish" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  validateSearch: (search) => ({
    projectId: typeof search.projectId === "string" ? search.projectId : undefined,
    clientId: typeof search.clientId === "string" ? search.clientId : undefined,
    clientKey: typeof search.clientKey === "string" ? search.clientKey : undefined,
    view:
      search.view === "changelog"
        ? ("changelog" as const)
        : search.view === "whats-new"
          ? ("whats-new" as const)
          : ("requests" as const),
    appVersion: typeof search.appVersion === "string" ? search.appVersion : undefined,
  }),
  component: EmbedPage,
});

type EmbedScreen = { name: "list" } | { name: "new" } | { name: "detail"; requestId: string };

function getEmbedHttpBaseUrl() {
  try {
    const baseUrl = getConvexHttpBaseUrl(import.meta.env.VITE_CONVEX_URL);
    return baseUrl.startsWith("https://") || baseUrl.startsWith("http://") ? baseUrl : "";
  } catch {
    return "";
  }
}

function EmbedPage() {
  const { projectId, clientId, clientKey, view, appVersion } = Route.useSearch();
  const baseUrl = getEmbedHttpBaseUrl();
  const config = useMemo(
    () =>
      projectId && clientId && clientKey && baseUrl
        ? { baseUrl, projectId, clientId, clientKey }
        : null,
    [baseUrl, projectId, clientId, clientKey],
  );

  const identity = JSON.stringify([baseUrl, projectId, clientId, clientKey, view, appVersion]);
  useEmbedContentState(
    view,
    !config || (view === "whats-new" && !appVersion) ? "error" : undefined,
    appVersion,
  );

  if (!config) {
    return (
      <EmbedShell>
        <EmbedNotice
          title="Feedback is unavailable"
          description="This embed has missing or invalid configuration. Check the appId, clientKey, and externalUserId passed to Wish.configure."
        />
      </EmbedShell>
    );
  }

  if (view === "changelog") {
    return <EmbedChangelogApp key={identity} config={config} />;
  }

  if (view === "whats-new") {
    if (!appVersion) {
      return (
        <EmbedShell>
          <EmbedNotice
            title="Feedback is unavailable"
            description="This embed is missing its configuration. Check the appVersion passed to Wish.configure."
          />
        </EmbedShell>
      );
    }

    return <EmbedWhatsNewApp key={identity} config={config} appVersion={appVersion} />;
  }

  return <EmbedRequestsApp key={identity} config={config} />;
}

function EmbedRequestsApp({ config }: { config: EmbedApiConfig }) {
  const [screen, setScreen] = useState<EmbedScreen>({ name: "list" });

  const pendingVotes = useRef(new Set<string>());
  const voteOverrides = useRef(new Map<string, boolean>());
  const needsVoteReconciliation = useRef(false);
  const isActive = useRef(true);
  useEffect(() => {
    isActive.current = true;
    return () => {
      isActive.current = false;
    };
  }, []);
  const [voting, setVoting] = useState(new Set<string>());

  const loadRequests = useCallback(
    async (signal: AbortSignal) => {
      const [nextRequests, nextUpvoted] = await Promise.all([
        listEmbedRequests(config, signal),
        listEmbedUpvotedRequestIds(config, signal),
      ]);
      if (voteOverrides.current.size) {
        needsVoteReconciliation.current = true;
        for (const request of nextRequests) {
          const wanted = voteOverrides.current.get(request._id);
          if (wanted === undefined || wanted === nextUpvoted.has(request._id)) continue;
          request.upvoteCount = Math.max(0, (request.upvoteCount ?? 0) + (wanted ? 1 : -1));
          if (wanted) nextUpvoted.add(request._id);
          else nextUpvoted.delete(request._id);
        }
      }
      nextRequests.sort((a, b) => b._creationTime - a._creationTime);
      return { requests: nextRequests, upvoted: nextUpvoted };
    },
    [config],
  );

  const { data, setData, loadError, isLoading, reload } = useEmbedResource(loadRequests);
  useEmbedContentState("requests", loadError ? "error" : data ? "ready" : undefined);
  const requests = data?.requests;
  const upvoted = data?.upvoted ?? new Set<string>();

  function setVote(requestId: string, wanted: boolean) {
    setData((current) => {
      if (!current) {
        return current;
      }
      const nextUpvoted = new Set(current.upvoted);
      const delta = Number(wanted) - Number(current.upvoted.has(requestId));
      if (wanted) nextUpvoted.add(requestId);
      else nextUpvoted.delete(requestId);
      return {
        upvoted: nextUpvoted,
        requests: current.requests.map((request) =>
          request._id === requestId
            ? {
                ...request,
                upvoteCount: Math.max(0, (request.upvoteCount ?? 0) + delta),
              }
            : request,
        ),
      };
    });
  }

  async function handleUpvote(requestId: string) {
    if (pendingVotes.current.has(requestId)) return;
    pendingVotes.current.add(requestId);
    setVoting(new Set(pendingVotes.current));
    if (pendingVotes.current.size > 1 || isLoading) needsVoteReconciliation.current = true;
    const wasUpvoted = upvoted.has(requestId);
    voteOverrides.current.set(requestId, !wasUpvoted);
    setVote(requestId, !wasUpvoted);

    try {
      await toggleEmbedUpvote(config, requestId);
    } catch (error) {
      if (!isActive.current) return;
      toast.error(error instanceof Error ? error.message : "Could not update the vote.");
      voteOverrides.current.set(requestId, wasUpvoted);
      setVote(requestId, wasUpvoted);
      needsVoteReconciliation.current = true;
    } finally {
      pendingVotes.current.delete(requestId);
      if (isActive.current) {
        setVoting(new Set(pendingVotes.current));
        if (pendingVotes.current.size === 0) {
          voteOverrides.current.clear();
          if (needsVoteReconciliation.current) {
            needsVoteReconciliation.current = false;
            await reload(true);
          }
        }
      }
    }
  }

  if (loadError && data === undefined) {
    return (
      <EmbedShell>
        <EmbedNotice title="Could not load feedback" description={loadError}>
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
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
            void reload(true);
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
            isVoting={voting.has(request._id)}
            onUpvote={() => void handleUpvote(request._id)}
            onBack={() => setScreen({ name: "list" })}
          />
        ) : (
          <EmbedNotice title="Request not found" description="This request is no longer available.">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setScreen({ name: "list" })}
            >
              Back to requests
            </Button>
          </EmbedNotice>
        )}
      </EmbedShell>
    );
  }

  return (
    <EmbedShell>
      <EmbedRefreshState isLoading={isLoading} loadError={loadError} onRetry={reload} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Feature requests</h1>
        <Button type="button" size="sm" onClick={() => setScreen({ name: "new" })}>
          <Plus />
          New request
        </Button>
      </div>

      <Separator className="my-4" />

      {requests.length === 0 ? (
        <EmbedNotice title="No requests yet" description="Be the first to suggest an improvement.">
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
                isPending={voting.has(request._id)}
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
                  <time className="text-xs text-muted-foreground">
                    {formatDate(request._creationTime)}
                  </time>
                </div>
                <h2 className="text-sm font-semibold tracking-tight">{request.text}</h2>
                {request.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {request.description}
                  </p>
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
  isVoting,
  onUpvote,
  onBack,
}: {
  config: EmbedApiConfig;
  request: EmbedRequest;
  isUpvoted: boolean;
  isVoting: boolean;
  onUpvote: () => void;
  onBack: () => void;
}) {
  const [commentText, setCommentText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadComments = useCallback(
    (signal: AbortSignal) => listEmbedComments(config, request._id, signal),
    [config, request._id],
  );
  const {
    data: comments,
    loadError: commentsError,
    isLoading: commentsLoading,
    reload: reloadComments,
  } = useEmbedResource(loadComments);

  useEmbedContentState("comments", commentsError ? "error" : comments ? "ready" : undefined);

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
      await reloadComments(true);
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
        <UpvoteButton
          upvoteCount={request.upvoteCount ?? 0}
          isUpvoted={isUpvoted}
          isPending={isVoting}
          onClick={onUpvote}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {request.computedStatus ? (
              <Badge variant="secondary">{request.computedStatus.displayName}</Badge>
            ) : null}
            <time className="text-xs text-muted-foreground">
              {formatDate(request._creationTime)}
            </time>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">{request.text}</h1>
          {request.description ? (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {request.description}
            </p>
          ) : null}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <MessageCircle className="size-4" />
          Comments
        </h2>

        {comments !== undefined ? (
          <EmbedRefreshState
            isLoading={commentsLoading}
            loadError={commentsError}
            onRetry={reloadComments}
          />
        ) : null}
        {commentsError && comments === undefined ? (
          <EmbedNotice title="Could not load comments" description={commentsError}>
            <Button type="button" variant="outline" size="sm" onClick={() => void reloadComments()}>
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
                <p className="mt-1 text-sm whitespace-pre-wrap">{comment.body}</p>
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

function EmbedChangelogApp({ config }: { config: EmbedApiConfig }) {
  const loadFeed = useCallback(
    (signal: AbortSignal) => getEmbedChangelog(config, signal),
    [config],
  );
  const { data: feed, loadError, isLoading, reload } = useEmbedResource(loadFeed);
  useEmbedContentState(
    "changelog",
    loadError ? "error" : feed ? (feed.entries.length ? "ready" : "empty") : undefined,
  );

  if (loadError && feed === undefined) {
    return (
      <EmbedShell>
        <EmbedNotice title="Could not load updates" description={loadError}>
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
            Retry
          </Button>
        </EmbedNotice>
      </EmbedShell>
    );
  }

  if (feed === undefined) {
    return (
      <EmbedShell>
        <div className="flex justify-center py-16">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      </EmbedShell>
    );
  }

  return (
    <EmbedShell>
      <EmbedRefreshState isLoading={isLoading} loadError={loadError} onRetry={reload} />
      <div>
        <h1 className="text-lg font-semibold tracking-tight">What's new</h1>
        {feed.project.title ? (
          <p className="text-sm text-muted-foreground">{feed.project.title}</p>
        ) : null}
      </div>

      <Separator className="my-4" />

      {feed.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No published updates yet.</p>
      ) : (
        <div className="space-y-4">
          {feed.entries.map((entry) => (
            <EmbedChangelogEntryCard key={entry.versionLabel} entry={entry} />
          ))}
        </div>
      )}
    </EmbedShell>
  );
}

function EmbedChangelogEntryCard({ entry }: { entry: EmbedChangelogEntry }) {
  return (
    <article className="space-y-4 py-3 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline">{entry.versionLabel}</Badge>
        <time className="text-xs text-muted-foreground">{formatDate(entry.publishedAt)}</time>
      </div>
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold tracking-tight">{entry.title}</h2>
        {entry.summary ? (
          <p className="text-sm leading-6 text-muted-foreground">{entry.summary}</p>
        ) : null}
      </div>
      <ul className="grid gap-4" aria-label={`Features in ${entry.versionLabel}`}>
        {entry.features.map((feature) => (
          <li key={feature.title} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand [&>svg]:size-4">
              <ChangelogFeatureIcon name={feature.icon} />
            </span>
            <div className="grid gap-0.5">
              <h3 className="text-sm font-medium">{feature.title}</h3>
              {feature.description ? (
                <p className="text-sm leading-5 whitespace-pre-wrap text-muted-foreground">
                  {feature.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <Separator />
    </article>
  );
}

function EmbedWhatsNewApp({ config, appVersion }: { config: EmbedApiConfig; appVersion: string }) {
  const loadEntry = useCallback(
    (signal: AbortSignal) => getEmbedWhatsNew(config, appVersion, signal),
    [config, appVersion],
  );
  const { data: entry, loadError, isLoading, reload } = useEmbedResource(loadEntry);
  useEmbedContentState(
    "whats-new",
    loadError ? "error" : entry === undefined ? undefined : entry ? "ready" : "empty",
    appVersion,
  );

  if (loadError && entry === undefined) {
    return (
      <EmbedShell>
        <EmbedNotice title="Could not load updates" description={loadError}>
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
            Retry
          </Button>
        </EmbedNotice>
      </EmbedShell>
    );
  }

  if (entry === undefined) {
    return (
      <EmbedShell>
        <div className="flex justify-center py-16">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      </EmbedShell>
    );
  }

  return (
    <EmbedShell>
      <EmbedRefreshState isLoading={isLoading} loadError={loadError} onRetry={reload} />
      <h1 className="text-lg font-semibold tracking-tight">What's new</h1>
      <Separator className="my-4" />
      {entry ? (
        <EmbedChangelogEntryCard entry={entry} />
      ) : (
        <p className="text-sm text-muted-foreground">No release notes for this version.</p>
      )}
    </EmbedShell>
  );
}

function UpvoteButton({
  upvoteCount,
  isUpvoted,
  onClick,
  isPending = false,
}: {
  upvoteCount: number;
  isUpvoted: boolean;
  onClick: () => void;
  isPending?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={isUpvoted ? "default" : "outline"}
      className="h-10 shrink-0 gap-1.5 px-3"
      aria-pressed={isUpvoted}
      aria-busy={isPending}
      disabled={isPending}
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

function EmbedRefreshState({
  isLoading,
  loadError,
  onRetry,
}: {
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => Promise<void>;
}) {
  if (loadError) {
    return (
      <div role="alert" className="mb-3 flex items-center gap-2 text-sm text-destructive">
        <span>{loadError}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => void onRetry()}>
          Retry
        </Button>
      </div>
    );
  }
  return isLoading ? (
    <p role="status" className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner aria-hidden />
      Updating…
    </p>
  ) : null;
}
