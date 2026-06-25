"use client";

import { AlertTriangle, Inbox, Search } from "lucide-react";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@wish/convex-backend/api";
import type { Id } from "@wish/convex-backend/data-model";

import { ComplaintCaseDetail } from "./complaints/ComplaintCaseDetail";
import { ComplaintCaseList } from "./complaints/ComplaintCaseList";
import {
  getFilterCounts,
  isComplaintOverdue,
  terminalComplaintStages,
} from "./complaints/complaintCaseHelpers";

const filters = ["all", "triage", "overdue", "mine", "critical", "closed"] as const;
const filterLabels = {
  all: "All",
  triage: "Triage",
  overdue: "Overdue",
  mine: "Mine",
  critical: "Critical",
  closed: "Closed",
} satisfies Record<(typeof filters)[number], string>;

export default function ProjectComplaints({ projectId }: { projectId: Id<"projects"> }) {
  const data = useQuery(api.complaintCases.getByProject, { id: projectId });
  const [selectedId, setSelectedId] = useState<Id<"requests"> | undefined>();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [search, setSearch] = useState("");

  const complaints = useMemo(() => data?.complaints ?? [], [data?.complaints]);
  const counts = data ? getFilterCounts(complaints, data.currentUser._id) : undefined;

  const visibleComplaints = useMemo(() => {
    const query = search.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const stage = complaint.complaintStage ?? "new";
      const matchesFilter =
        filter === "all" ||
        (filter === "triage" && stage === "new") ||
        (filter === "overdue" && isComplaintOverdue(stage, complaint.complaintFirstResponseDueAt)) ||
        (filter === "mine" && complaint.complaintOwnerUserId === data?.currentUser._id) ||
        (filter === "critical" && complaint.complaintSeverity === "S1") ||
        (filter === "closed" && terminalComplaintStages.has(stage));

      if (!matchesFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        complaint.text,
        complaint.description,
        complaint.clientId,
        complaint.requesterEmail,
        complaint.complaintCategory,
        complaint.ownerName,
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [complaints, data?.currentUser._id, filter, search]);

  useEffect(() => {
    if (selectedId && visibleComplaints.some((complaint) => complaint._id === selectedId)) {
      return;
    }

    setSelectedId(visibleComplaints[0]?._id);
  }, [selectedId, visibleComplaints]);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center px-6 sidebar-offset-pl">
        <Spinner />
      </div>
    );
  }

  const selectedComplaint = visibleComplaints.find((complaint) => complaint._id === selectedId);

  if (complaints.length === 0) {
    return (
      <div className="h-full overflow-y-auto px-4 py-4 sidebar-offset-pl md:px-6">
        <Empty className="mx-auto min-h-80 max-w-5xl border border-dashed bg-muted/20">
          <EmptyHeader>
            <Inbox className="mx-auto size-8 text-muted-foreground" />
            <EmptyTitle>No complaints yet</EmptyTitle>
            <EmptyDescription>
              Negative review feedback will appear here without entering the public request board.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden px-4 py-4 sidebar-offset-pl md:px-6">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Complaint cases</h2>
            <p className="text-sm text-muted-foreground">
              Triage customer harm, assign custody, track SLA risk, and require evidence before closure.
            </p>
          </div>
          {counts?.overdue ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="size-4" />
              {counts.overdue} overdue
            </div>
          ) : null}
        </header>

        <section className="grid gap-3 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <div className="grid gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search complaints"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={filter === item ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(item)}
                >
                  {filterLabels[item]}
                  {counts ? <span className="text-xs opacity-70">{counts[item]}</span> : null}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <div className="min-h-0 overflow-y-auto pr-1">
            {visibleComplaints.length > 0 ? (
              <ComplaintCaseList
                complaints={visibleComplaints}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No complaints match this view.
              </div>
            )}
          </div>

          <ComplaintCaseDetail complaint={selectedComplaint} currentUser={data.currentUser} />
        </div>
      </div>
    </div>
  );
}
