import { Link, createFileRoute } from "@tanstack/react-router";
import { api } from "@wish/convex-backend/api";
import { useQuery } from "convex/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/time";

export const Route = createFileRoute("/changelog/$slug")({
  component: PublicChangelogPage,
});

function PublicChangelogPage() {
  const { slug } = Route.useParams();
  const feed = useQuery(api.changelogEntries.getPublicBySlug, { slug });

  if (feed === undefined) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!feed) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
          <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-background/90 p-8">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Changelog not found</h1>
              <p className="text-sm text-muted-foreground">
                This public changelog URL does not exist or has not been set up yet.
              </p>
            </div>
            <div className="mt-6">
              <Button asChild>
                <Link to="/">Back home</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {feed.project.title}
          </h1>
        </div>

        <Separator className="mb-8" />

        <div className="space-y-4">
          {feed.entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
              No published entries yet.
            </div>
          ) : (
            feed.entries.map((entry) => (
              <section
                key={`${entry.versionLabel}-${entry.publishedAt ?? 0}`}
                className="space-y-4 py-6 first:pt-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{entry.versionLabel}</Badge>
                      <Badge variant="secondary" className="capitalize">
                        {entry.type}
                      </Badge>
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight">{entry.title}</h2>
                  </div>

                  <time className="text-sm text-muted-foreground">
                    {formatDate(entry.publishedAt)}
                  </time>
                </div>

                {entry.summary ? (
                  <p className="text-base leading-7 text-muted-foreground">{entry.summary}</p>
                ) : null}

                {entry.body ? (
                  <div className="text-base leading-7 whitespace-pre-wrap text-foreground/90">
                    {entry.body}
                  </div>
                ) : null}

                <Separator />
              </section>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
