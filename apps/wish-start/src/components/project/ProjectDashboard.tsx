"use client";

import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { AlertTriangle, ArrowUp, CheckCircle2, Map } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

const CLOSED_STAGES = new Set(["closed", "rejected", "duplicate"]);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type ProjectViewTo =
  | "/dashboard/project/$projectId/$slug/requests"
  | "/dashboard/project/$projectId/$slug/complaints"
  | "/dashboard/project/$projectId/$slug/roadmap";

export default function ProjectDashboard({ projectId, slug }: { projectId: Id<"projects">; slug: string }) {
  const requests = useQuery(api.requests.getByProject, { id: projectId });
  const complaints = useQuery(api.complaintCases.getByProject, { id: projectId });
  const roadmap = useQuery(api.changelogEntries.listByProject, { projectId });

  const params = { projectId, slug };

  const openComplaints = (complaints?.complaints ?? [])
    .filter((complaint) => !CLOSED_STAGES.has(complaint.complaintStage ?? "new"))
    .sort((a, b) => (a.complaintSeverity ?? "S9").localeCompare(b.complaintSeverity ?? "S9"))
    .slice(0, 4);

  const topRequests = [...(requests ?? [])]
    .sort((a, b) => (b.upvoteCount ?? 0) - (a.upvoteCount ?? 0))
    .slice(0, 4);

  const drafts = (roadmap ?? []).filter((entry) => entry.status === "draft").slice(0, 4);

  const since = Date.now() - WEEK_MS;
  const weeklyRequests = (requests ?? []).filter((request) => request._creationTime > since).length;
  const weeklyComplaints = (complaints?.complaints ?? []).filter(
    (complaint) => complaint._creationTime > since,
  ).length;
  const weeklyPublished = (roadmap ?? []).filter(
    (entry) => entry.status === "published" && (entry.publishedAt ?? 0) > since,
  ).length;

  const loaded = requests && complaints && roadmap;

  return (
    <ScrollArea className="min-h-0 flex-1 pr-1">
      <div className="sidebar-offset-pl">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-2 pt-px pb-6 md:px-6">
          <TriageSection title="Needs attention">
            {openComplaints.map((complaint) => (
              <TriageRow
                key={complaint._id}
                to="/dashboard/project/$projectId/$slug/complaints"
                params={params}
                marker={
                  <Badge variant={complaint.complaintSeverity === "S1" ? "destructive" : "secondary"}>
                    {complaint.complaintSeverity ?? complaint.complaintStage ?? "new"}
                  </Badge>
                }
                text={complaint.text}
                icon={<AlertTriangle className="size-4 text-muted-foreground" />}
              />
            ))}
            {topRequests.map((request) => (
              <TriageRow
                key={request._id}
                to="/dashboard/project/$projectId/$slug/requests"
                params={params}
                marker={
                  <span className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
                    <ArrowUp className="size-3.5" />
                    {request.upvoteCount ?? 0}
                  </span>
                }
                text={request.text}
              />
            ))}
            {loaded && openComplaints.length === 0 && topRequests.length === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" />
                All clear — no open complaints or requests.
              </div>
            )}
          </TriageSection>

          {drafts.length > 0 && (
            <TriageSection title="Ready to publish">
              {drafts.map((entry) => (
                <TriageRow
                  key={entry._id}
                  to="/dashboard/project/$projectId/$slug/roadmap"
                  params={params}
                  marker={<Badge variant="secondary">{entry.versionLabel || "draft"}</Badge>}
                  text={entry.title || "Untitled entry"}
                  icon={<Map className="size-4 text-muted-foreground" />}
                />
              ))}
            </TriageSection>
          )}

          {loaded && (
            <p className="text-sm text-muted-foreground">
              This week: {weeklyRequests} new {weeklyRequests === 1 ? "request" : "requests"} ·{" "}
              {weeklyComplaints} new {weeklyComplaints === 1 ? "complaint" : "complaints"} · {weeklyPublished}{" "}
              published {weeklyPublished === 1 ? "update" : "updates"}
            </p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function TriageSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function TriageRow({
  to,
  params,
  marker,
  text,
  icon,
}: {
  to: ProjectViewTo;
  params: { projectId: Id<"projects">; slug: string };
  marker: React.ReactNode;
  text: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      params={params}
      className="flex items-center gap-3 rounded-lg border bg-background/70 p-3 transition-colors hover:bg-accent/50"
    >
      {icon}
      <span className="shrink-0">{marker}</span>
      <span className="line-clamp-1 text-sm font-medium">{text}</span>
    </Link>
  );
}
