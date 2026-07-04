import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@wish/convex-backend/api";

type ProjectBreakdownItem =
  (typeof api.stats.requestOverview._returnType)["projectBreakdown"][number];

type ProjectBreakdownCardProps = {
  projects: ProjectBreakdownItem[];
  total: number;
  className?: string;
};

export function ProjectBreakdownCard({ projects, total, className }: ProjectBreakdownCardProps) {
  const hasData = projects.length > 0 && total > 0;
  const palette = ["#f97316", "#0ea5e9", "#a855f7", "#22c55e", "#f59e0b", "#10b981"];
  const dataset = projects.map((project, index) => ({
    key: toKey(project.title, index),
    title: project.title,
    count: project.count,
    percent: total ? Math.round((project.count / total) * 100) : 0,
    color: palette[index % palette.length],
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Requests by project</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-muted-foreground">No project activity yet.</p>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataset} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="title" tickLine={false} axisLine={false} width={120} />
                <Tooltip cursor={{ fill: "var(--muted)" }} formatter={(value) => `${value} requests`} />
                <Bar dataKey="count" radius={6}>
                  {dataset.map((project) => (
                    <Cell key={project.key} fill={project.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
  return base || `project-${index}`;
}
