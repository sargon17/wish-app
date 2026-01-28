"use client";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";

import { ProjectBreakdownCard } from "./ProjectBreakdownCard";
import { RequestsSummaryCards } from "./RequestsSummaryCards";
import { RequestsTrendCard } from "./RequestsTrendCard";
import { StatsLoading } from "./StatsLoading";
import { StatusBreakdownCard } from "./StatusBreakdownCard";

export function StatsPageContent() {
  const stats = useQuery(api.stats.requestOverview);

  if (stats === undefined) {
    return <StatsLoading />;
  }

  return (
    <div className="flex flex-col gap-6 sidebar-offset-pl">
      <RequestsSummaryCards stats={stats} />
      <div className="grid gap-4 lg:grid-cols-12">
        <RequestsTrendCard data={stats.weeklyTrend} className="lg:col-span-7" />
        <StatusBreakdownCard
          statuses={stats.statusBreakdown}
          total={stats.totalRequests}
          className="lg:col-span-5"
        />
      </div>
      <ProjectBreakdownCard projects={stats.projectBreakdown} total={stats.totalRequests} />
    </div>
  );
}
