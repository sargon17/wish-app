import { Cell, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { api } from "@/convex/_generated/api";

type StatusBreakdownItem =
  (typeof api.stats.requestOverview._returnType)["statusBreakdown"][number];

const STATUS_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type StatusBreakdownCardProps = {
  statuses: StatusBreakdownItem[];
  total: number;
  className?: string;
};

export function StatusBreakdownCard({ statuses, total, className }: StatusBreakdownCardProps) {
  const hasData = statuses.length > 0 && total > 0;
  const dataset = statuses.map((status, index) => ({
    key: toKey(status.name, index),
    name: status.name,
    count: status.count,
    percent: total ? Math.round((status.count / total) * 100) : 0,
    color: status.color ?? STATUS_PALETTE[index % STATUS_PALETTE.length],
    displayName: status.displayName,
  }));

  const config: ChartConfig = dataset.reduce((acc, status) => {
    acc[status.key] = {
      label: status.displayName ?? status.name,
      color: status.color,
    };
    return acc;
  }, {} as ChartConfig);

  const legendItems = dataset.map((item) => ({
    key: item.key,
    label: item.displayName ?? item.name,
    color: item.color,
    percent: item.percent,
    count: item.count,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Status breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">No statuses to display yet.</p>
        ) : (
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <ChartContainer config={config} className="min-h-80 w-full md:w-[60%]">
              <PieChart>
                <Pie
                  data={dataset}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  strokeWidth={2}
                >
                  {dataset.map((status) => (
                    <Cell key={status.key} fill={status.color} stroke="none" />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="Status"
                      formatter={(value, _name, payload) =>
                        `${value} requests (${payload?.payload?.percent ?? 0}%)`
                      }
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
            <div className="flex w-full flex-col gap-2 md:w-[40%] md:max-h-[320px] md:overflow-y-auto">
              <div className="flex flex-col gap-2">
                {legendItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-1 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-foreground" title={item.label}>
                        {item.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function toKey(name: string, index: number) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `status-${index}`;
}
