import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@wish/convex-backend/api";
import { ArrowUpRight, MessageCircle, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import ThemeTabs from "@/components/Organisms/ThemeTabs";
import PortalRequestControls from "@/components/portal/PortalRequestControls";
import { PublicRequestSubmitDialog } from "@/components/portal/PublicRequestSubmitDialog";
import { PublicUpvoteButton } from "@/components/portal/PublicUpvoteButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useRequesterIdentity } from "@/hooks/useRequesterIdentity";
import { normalizePortalDateRange } from "@/lib/portalDateRange";
import { normalizePortalSort } from "@/lib/portalSort";
import { requestSlug } from "@/lib/slug";
import { formatDate } from "@/lib/time";

const PORTAL_PAGE_SIZE = 20;
export const Route = createFileRoute("/p/$projectSlug/")({
  head: () => ({
    meta: [
      { title: "Suggestion Portal - Wish" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content: "Browse, search, vote, and submit product suggestions.",
      },
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
  component: SuggestionPortalPage,
});

function SuggestionPortalPage() {
  const { projectSlug } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const clientId = useRequesterIdentity();
  const [searchText, setSearchText] = useState(searchParams.q ?? "");
  const [visibleLimit, setVisibleLimit] = useState(PORTAL_PAGE_SIZE);
  const {
    data: portal,
    error,
    isFetching,
  } = useQuery({
    ...convexQuery(api.suggestionPortals.getPublishedPortal, {
      projectSlug,
      clientId: clientId ?? undefined,
      search: searchParams.q,
      statusIds:
        searchParams.statuses === "none" ? [] : searchParams.statuses?.split(",").filter(Boolean),
      createdFrom: searchParams.from
        ? new Date(`${searchParams.from}T00:00:00`).getTime()
        : undefined,
      createdTo: searchParams.to
        ? new Date(`${searchParams.to}T23:59:59.999`).getTime()
        : undefined,
      sort: searchParams.sort,
      limit: visibleLimit,
    }),
    placeholderData: (previousData) =>
      previousData?.project.projectSlug === projectSlug ? previousData : undefined,
  });
  const isRefreshing = isFetching && portal !== undefined;
  const activeFilterCount =
    (searchParams.q ? 1 : 0) +
    (searchParams.statuses ? 1 : 0) +
    (searchParams.from ? 1 : 0) +
    (searchParams.to ? 1 : 0);

  useEffect(() => {
    setSearchText(searchParams.q ?? "");
  }, [searchParams.q]);

  useEffect(() => {
    setVisibleLimit(PORTAL_PAGE_SIZE);
  }, [
    projectSlug,
    searchParams.q,
    searchParams.statuses,
    searchParams.from,
    searchParams.to,
    searchParams.sort,
  ]);

  function filters(overrides = {}) {
    return {
      q: searchParams.q,
      statuses: searchParams.statuses,
      from: searchParams.from,
      to: searchParams.to,
      sort: searchParams.sort,
      ...overrides,
    };
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void navigate({
      search: filters({ q: searchText.trim() || undefined }),
    });
  }

  function setStatuses(statuses: string[]) {
    void navigate({
      search: filters({
        statuses:
          statuses.length === portal?.statuses.length
            ? undefined
            : statuses.length > 0
              ? statuses.join(",")
              : "none",
      }),
    });
  }

  function setSort(sort: "top" | "newest") {
    void navigate({
      search: filters({ sort }),
    });
  }

  function setDateRange(from?: string, to?: string) {
    void navigate({
      search: filters({
        from: from || undefined,
        to: to || undefined,
      }),
    });
  }

  if (error) {
    return <PortalLoadError />;
  }

  if (portal === undefined) {
    return <PortalLoading />;
  }

  if (!portal) {
    return <PortalNotFound />;
  }

  const selectedStatuses =
    searchParams.statuses === undefined
      ? portal.statuses.map((status) => status._id)
      : searchParams.statuses === "none"
        ? []
        : portal.statuses
            .filter((status) => searchParams.statuses?.split(",").includes(status._id))
            .map((status) => status._id);

  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <div className="w-full px-4 py-4 sm:px-6 md:py-6 lg:px-8 2xl:px-12">
        <header>
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <span className="size-2 rounded-full bg-orange-500" />
              Feedback board
            </div>
            <div className="flex items-center gap-1">
              {portal.project.publicChangelogSlug ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/changelog/$slug" params={{ slug: portal.project.publicChangelogSlug }}>
                    Changelog
                  </Link>
                </Button>
              ) : null}
              <ThemeTabs />
            </div>
          </div>

          <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-end sm:justify-between md:py-8">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-medium text-orange-600">
                Suggest. Vote. Shape what comes next.
              </p>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-balance sm:text-3xl md:text-4xl">
                {portal.project.title}
              </h1>
              <p className="max-w-xl text-sm leading-5 text-muted-foreground">
                Explore what the community is asking for, add your vote, or share an idea with the
                team.
              </p>
            </div>

            <PublicRequestSubmitDialog
              projectSlug={projectSlug}
              defaultTitle={searchParams.q ?? ""}
            >
              <Button size="sm" className="shrink-0">
                <Plus />
                Submit request
              </Button>
            </PublicRequestSubmitDialog>
          </div>
        </header>

        <div className="border-y py-3 lg:hidden">
          <Drawer>
            <DrawerTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-between shadow-none"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4" />
                  Search and filter
                </span>
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-orange-500 px-1.5 text-xs text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <DrawerHeader className="px-0">
                <DrawerTitle>Search and filter</DrawerTitle>
                <DrawerDescription>
                  Narrow the requests without leaving the board.
                </DrawerDescription>
              </DrawerHeader>
              <div className="min-h-0 overflow-y-auto pb-1">
                <form className="flex gap-2" onSubmit={applySearch}>
                  <div className="relative flex-1">
                    <label className="sr-only" htmlFor="portal-search-mobile">
                      Search requests
                    </label>
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="portal-search-mobile"
                      className="h-9 bg-background pl-9 shadow-none"
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search requests"
                    />
                  </div>
                  <Button type="submit" variant="outline" size="sm" className="h-9 shrink-0">
                    Search
                  </Button>
                </form>
                <Separator />
                <PortalRequestControls
                  statuses={portal.statuses}
                  selectedStatuses={selectedStatuses}
                  selectedSort={searchParams.sort}
                  createdFrom={searchParams.from}
                  createdTo={searchParams.to}
                  onStatusesChange={setStatuses}
                  onSortChange={setSort}
                  onDateRangeChange={setDateRange}
                />
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-10 xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-14">
          <aside className="hidden border-y py-4 lg:sticky lg:top-6 lg:block">
            <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Find requests
            </p>
            <form className="flex gap-2" onSubmit={applySearch}>
              <div className="relative flex-1">
                <label className="sr-only" htmlFor="portal-search">
                  Search requests
                </label>
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="portal-search"
                  className="h-9 bg-background pl-9 shadow-none"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search requests"
                />
              </div>
              <Button type="submit" variant="outline" size="sm" className="h-9 shrink-0">
                Search
              </Button>
            </form>

            <Separator className="my-3" />
            <PortalRequestControls
              statuses={portal.statuses}
              selectedStatuses={selectedStatuses}
              selectedSort={searchParams.sort}
              createdFrom={searchParams.from}
              createdTo={searchParams.to}
              onStatusesChange={setStatuses}
              onSortChange={setSort}
              onDateRangeChange={setDateRange}
            />
          </aside>

          <section className="mt-6 lg:mt-0" aria-busy={isRefreshing}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Community requests
                </p>
                <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                  Showing {portal.requests.length} of {portal.page.totalCount} requests
                </p>
              </div>
            </div>

            {portal.requests.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>No matching requests</EmptyTitle>
                  <EmptyDescription>
                    Submit the first matching request so the team can consider it.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <PublicRequestSubmitDialog
                    projectSlug={projectSlug}
                    defaultTitle={searchParams.q ?? ""}
                  >
                    <Button>
                      <Plus />
                      Submit request
                    </Button>
                  </PublicRequestSubmitDialog>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="border-y bg-card">
                {portal.requests.map((request) => {
                  const status = portal.statuses.find((item) => item._id === request.status);

                  return (
                    <article
                      key={request._id}
                      className="group relative border-b px-2 py-3 last:border-b-0 hover:bg-orange-50/50 sm:px-3 sm:py-4 dark:hover:bg-orange-950/15"
                    >
                      <Link
                        className="absolute inset-0 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-orange-500"
                        to="/p/$projectSlug/r/$requestId/$requestSlug"
                        params={{
                          projectSlug,
                          requestId: request._id,
                          requestSlug: requestSlug(request.text),
                        }}
                        search={searchParams}
                        aria-label={`Open request: ${request.text}`}
                      />
                      <div className="pointer-events-none flex gap-3 sm:gap-4">
                        <PublicUpvoteButton
                          projectSlug={projectSlug}
                          requestId={request._id}
                          upvoteCount={request.upvoteCount ?? 0}
                          isUpvoted={request.isUpvoted}
                          className="pointer-events-auto relative z-10 h-11 w-12 shrink-0 flex-col gap-0 rounded-lg px-1.5"
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {status ? (
                              <Badge variant="secondary">{status.displayName}</Badge>
                            ) : null}
                            <time className="text-xs text-muted-foreground">
                              {formatDate(request._creationTime)}
                            </time>
                          </div>
                          <h2 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                            {request.text}
                          </h2>
                          {request.description ? (
                            <p className="line-clamp-2 max-w-3xl text-sm leading-5 text-muted-foreground">
                              {request.description}
                            </p>
                          ) : null}
                          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <MessageCircle className="size-3.5" />
                              {request.commentCount} comments
                            </span>
                            <span className="flex items-center gap-1 font-medium text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-400">
                              Read request
                              <ArrowUpRight className="size-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {portal.page.nextCursor !== undefined ? (
                  <div className="flex justify-center border-t p-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setVisibleLimit((limit) => limit + PORTAL_PAGE_SIZE)}
                    >
                      Load more
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
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

function PortalLoadError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <div className="max-w-md border-y py-6 text-center">
        <h1 className="text-lg font-semibold">Could not load requests</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The request filters could not be applied. Refresh the page to try again.
        </p>
        <Button className="mt-4" size="sm" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    </main>
  );
}
