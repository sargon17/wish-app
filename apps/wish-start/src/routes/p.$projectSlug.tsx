import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { MessageCircle, Plus, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { PublicRequestSubmitDialog } from "@/components/portal/PublicRequestSubmitDialog";
import { PublicUpvoteButton } from "@/components/portal/PublicUpvoteButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useRequesterIdentity } from "@/hooks/useRequesterIdentity";
import { requestSlug } from "@/lib/requestSlug";
import { formatDate } from "@/lib/time";
import { api } from "@wish/convex-backend/api";

const PORTAL_PAGE_SIZE = 20;
const PORTAL_SORTS = ["top", "newest"] as const;

function normalizePortalSort(value: unknown) {
  return PORTAL_SORTS.includes(value as (typeof PORTAL_SORTS)[number])
    ? value as (typeof PORTAL_SORTS)[number]
    : "top";
}

export const Route = createFileRoute("/p/$projectSlug")({
  head: () => ({
    meta: [
      { title: "Suggestion Portal - Wish" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Browse, search, vote, and submit product suggestions." },
    ],
  }),
  validateSearch: (search) => ({
    q: typeof search.q === "string" ? search.q : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
    sort: normalizePortalSort(search.sort),
  }),
  component: SuggestionPortalPage,
});

function SuggestionPortalPage() {
  const { projectSlug } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const clientId = useRequesterIdentity();
  const [searchText, setSearchText] = useState(searchParams.q ?? "");
  const [visibleLimit, setVisibleLimit] = useState(PORTAL_PAGE_SIZE);
  const portal = useQuery(api.suggestionPortals.getPublishedPortal, {
    projectSlug,
    clientId: clientId ?? undefined,
    search: searchParams.q,
    statusId: searchParams.status,
    sort: searchParams.sort,
    limit: visibleLimit,
  });

  useEffect(() => {
    setSearchText(searchParams.q ?? "");
  }, [searchParams.q]);

  useEffect(() => {
    setVisibleLimit(PORTAL_PAGE_SIZE);
  }, [projectSlug, searchParams.q, searchParams.status, searchParams.sort]);

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate({
      search: {
        q: searchText.trim() || undefined,
        status: searchParams.status,
        sort: searchParams.sort,
      },
    });
  }

  function setStatus(status: string | undefined) {
    void navigate({
      search: {
        q: searchParams.q,
        status,
        sort: searchParams.sort,
      },
    });
  }

  function setSort(sort: (typeof PORTAL_SORTS)[number]) {
    void navigate({
      search: {
        q: searchParams.q,
        status: searchParams.status,
        sort,
      },
    });
  }

  if (portal === undefined) {
    return <PortalLoading />;
  }

  if (!portal) {
    return <PortalNotFound />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-12">
        <header className="space-y-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-600">Suggestion Portal</p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {portal.project.title}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              {portal.project.publicChangelogSlug ? (
                <Button variant="outline" asChild>
                  <Link to="/changelog/$slug" params={{ slug: portal.project.publicChangelogSlug }}>
                    Changelog
                  </Link>
                </Button>
              ) : null}
              <PublicRequestSubmitDialog projectSlug={projectSlug} defaultTitle={searchParams.q ?? ""}>
                <Button>
                  <Plus />
                  Submit request
                </Button>
              </PublicRequestSubmitDialog>
            </div>
          </div>

          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={applySearch}>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search requests"
              />
            </div>
            <Button type="submit" variant="outline">Search</Button>
          </form>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={searchParams.status ? "outline" : "default"}
                size="sm"
                onClick={() => setStatus(undefined)}
              >
                All
              </Button>
              {portal.statuses.map((status) => (
                <Button
                  key={status._id}
                  type="button"
                  variant={searchParams.status === status._id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus(status._id)}
                >
                  {status.displayName}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant={searchParams.sort === "top" ? "default" : "outline"}
                size="sm"
                onClick={() => setSort("top")}
              >
                Top
              </Button>
              <Button
                type="button"
                variant={searchParams.sort === "newest" ? "default" : "outline"}
                size="sm"
                onClick={() => setSort("newest")}
              >
                Newest
              </Button>
            </div>
          </div>
        </header>

        <Separator className="my-8" />

        {portal.requests.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No matching requests</EmptyTitle>
              <EmptyDescription>
                Submit the first matching request so the team can consider it.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <PublicRequestSubmitDialog projectSlug={projectSlug} defaultTitle={searchParams.q ?? ""}>
                <Button>
                  <Plus />
                  Submit request
                </Button>
              </PublicRequestSubmitDialog>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Showing {portal.requests.length} of {portal.page.totalCount} requests
            </p>
            {portal.requests.map((request) => {
              const status = portal.statuses.find((item) => item._id === request.status);

              return (
                <article key={request._id} className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex gap-4">
                    <PublicUpvoteButton
                      projectSlug={projectSlug}
                      requestId={request._id}
                      upvoteCount={request.upvoteCount ?? 0}
                      isUpvoted={request.isUpvoted}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {status ? <Badge variant="secondary">{status.displayName}</Badge> : null}
                        <time className="text-xs text-muted-foreground">{formatDate(request._creationTime)}</time>
                      </div>
                      <h2 className="text-lg font-semibold tracking-tight">
                        <Link
                          className="hover:underline"
                          to="/p/$projectSlug/r/$requestId/$requestSlug"
                          params={{
                            projectSlug,
                            requestId: request._id,
                            requestSlug: requestSlug(request.text),
                          }}
                          search={searchParams}
                        >
                          {request.text}
                        </Link>
                      </h2>
                      {request.description ? (
                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {request.description}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="size-3.5" />
                        <span>{request.commentCount} comments</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            {portal.page.nextCursor !== undefined ? (
              <div className="flex justify-center pt-3">
                <Button type="button" variant="outline" onClick={() => setVisibleLimit((limit) => limit + PORTAL_PAGE_SIZE)}>
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

function PortalLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </main>
  );
}

function PortalNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="max-w-md rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold">Suggestion portal not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This portal does not exist or has not been published.
        </p>
      </div>
    </main>
  );
}
