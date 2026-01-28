import { api } from "@/convex/_generated/api";



import { StatCard } from "@components/molecules/StatCard";

type RequestOverview = typeof api.stats.requestOverview._returnType;

type SummaryProps = {
  stats: RequestOverview;
};

export function RequestsSummaryCards({ stats }: SummaryProps) {
  const lastWeek = stats.weeklyTrend.at(-1)?.count ?? 0;
  const prevWeek = stats.weeklyTrend.at(-2)?.count ?? 0;
  const delta = lastWeek - prevWeek;
  const deltaLabel =
    prevWeek === 0 && lastWeek === 0
      ? "No change vs last week"
      : `${delta >= 0 ? "+" : ""}${delta} vs last week`;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard label="Total requests" value={stats.totalRequests} description={deltaLabel} />
      <StatCard
        label="Active projects"
        value={stats.projectBreakdown.length}
        description="Projects receiving requests"
      />
      <StatCard
        label="Statuses in use"
        value={stats.statusBreakdown.length}
        description="Distinct workflow steps"
      />
    </div>
  );
}
