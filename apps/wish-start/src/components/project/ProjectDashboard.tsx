"use client";

import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { AlertTriangle, ArrowRight, ListTodo, Map } from "lucide-react";

import { StatCard } from "@/components/molecules/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

export default function ProjectDashboard({ projectId, slug }: { projectId: Id<"projects">; slug: string }) {
  const requests = useQuery(api.requests.getByProject, { id: projectId });
  const complaints = useQuery(api.complaintCases.getByProject, { id: projectId });
  const roadmap = useQuery(api.changelogEntries.listByProject, { projectId });

  const requestCount = requests?.length ?? 0;
  const complaintCount = complaints?.complaints.length ?? 0;
  const roadmapCount = roadmap?.length ?? 0;

  return (
    <ScrollArea className="min-h-0 flex-1 pr-1">
      <div className="flex flex-col gap-6 pb-6 md:px-6 sidebar-offset-pl">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Requests" value={requestCount} description="Product feedback on the board" />
          <StatCard label="Complaints" value={complaintCount} description="Private customer issues" />
          <StatCard label="Roadmap" value={roadmapCount} description="Draft and published updates" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <PeekCard
            title="Recent requests"
            description="Latest feedback entering the product queue"
            empty="No requests yet."
            icon={<ListTodo className="size-4" />}
            to="/dashboard/project/$projectId/$slug/requests"
            params={{ projectId, slug }}
          >
            {requests?.slice(0, 4).map((request) => (
              <div key={request._id} className="rounded-lg border bg-background/70 p-3">
                <div className="line-clamp-2 text-sm font-medium">{request.text}</div>
                <div className="mt-2 text-xs text-muted-foreground">{request.upvoteCount ?? 0} upvotes</div>
              </div>
            ))}
          </PeekCard>

          <PeekCard
            title="Complaints"
            description="Newest private issues needing attention"
            empty="No complaints yet."
            icon={<AlertTriangle className="size-4" />}
            to="/dashboard/project/$projectId/$slug/complaints"
            params={{ projectId, slug }}
          >
            {complaints?.complaints.slice(0, 4).map((complaint) => (
              <div key={complaint._id} className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant={complaint.complaintSeverity === "S1" ? "destructive" : "secondary"}>
                    {complaint.complaintStage ?? "new"}
                  </Badge>
                  {complaint.complaintSeverity ? <Badge variant="outline">{complaint.complaintSeverity}</Badge> : null}
                </div>
                <div className="mt-2 line-clamp-2 text-sm font-medium">{complaint.text}</div>
              </div>
            ))}
          </PeekCard>

          <PeekCard
            title="Roadmap"
            description="Latest planned or published updates"
            empty="No roadmap entries yet."
            icon={<Map className="size-4" />}
            to="/dashboard/project/$projectId/$slug/roadmap"
            params={{ projectId, slug }}
          >
            {roadmap?.slice(0, 4).map((entry) => (
              <div key={entry._id} className="rounded-lg border bg-background/70 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant={entry.status === "published" ? "default" : "secondary"}>{entry.status}</Badge>
                  <span className="text-xs text-muted-foreground">{entry.versionLabel || "No version"}</span>
                </div>
                <div className="mt-2 line-clamp-2 text-sm font-medium">{entry.title || "Untitled entry"}</div>
              </div>
            ))}
          </PeekCard>
        </div>
      </div>
    </ScrollArea>
  );
}

function PeekCard({
  title,
  description,
  empty,
  icon,
  to,
  params,
  children,
}: {
  title: string;
  description: string;
  empty: string;
  icon: React.ReactNode;
  to: "/dashboard/project/$projectId/$slug/requests" | "/dashboard/project/$projectId/$slug/complaints" | "/dashboard/project/$projectId/$slug/roadmap";
  params: { projectId: Id<"projects">; slug: string };
  children: React.ReactNode;
}) {
  return (
    <Card className="min-h-[320px] bg-card/80">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to={to} params={params}>
              Open
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {children ? children : <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{empty}</div>}
      </CardContent>
    </Card>
  );
}
