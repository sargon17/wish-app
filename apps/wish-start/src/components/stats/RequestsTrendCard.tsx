import { api } from "@wish/convex-backend/api";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WeeklyTrendPoint = (typeof api.stats.requestOverview._returnType)["weeklyTrend"][number];

type RequestsTrendCardProps = {
  data: WeeklyTrendPoint[];
  className?: string;
};

const TIMEFRAMES = [4, 6, 8, 10, 12, 16];
const trendColor = "var(--accent-foreground)";

export function RequestsTrendCard({ data, className }: RequestsTrendCardProps) {
  const [timeframe, setTimeframe] = useState<number>(10);
  const filteredData = useMemo(() => {
    if (!data?.length) return [];
    return data.slice(-timeframe);
  }, [data, timeframe]);

  const hasData = filteredData.some((point) => point.count > 0);
  const rangeTotal = filteredData.reduce((acc, item) => acc + item.count, 0);
  const average = filteredData.length ? (rangeTotal / filteredData.length).toFixed(1) : "0";
  const lastWeek = filteredData.at(-1)?.count ?? 0;
  const prevWeek = filteredData.at(-2)?.count ?? 0;
  const delta = lastWeek - prevWeek;
  const deltaLabel =
    prevWeek === 0 && lastWeek === 0
      ? "No change vs prior week"
      : `${delta >= 0 ? "+" : ""}${delta} vs prior week`;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Requests per week</CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            Total: <span className="font-medium text-foreground">{rangeTotal}</span>
          </span>
          <span>
            Avg/week: <span className="font-medium text-foreground">{average}</span>
          </span>
          <span className="text-xs sm:text-sm">{deltaLabel}</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs tracking-wide uppercase">Range</span>
            <Select
              value={String(timeframe)}
              onValueChange={(value) => setTimeframe(Number(value))}
            >
              <SelectTrigger className="w-[120px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    Last {value}w
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">No request activity yet.</p>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ stroke: trendColor, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Requests"
                  stroke={trendColor}
                  fill="url(#fillRequests)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <defs>
                  <linearGradient id="fillRequests" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={trendColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={trendColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
