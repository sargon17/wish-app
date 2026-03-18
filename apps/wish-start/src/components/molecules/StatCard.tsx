"use client";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <Card className="gap-2 px-6 py-5">
      <CardTitle className="text-base text-muted-foreground">{label}</CardTitle>
      <div className="text-3xl font-semibold">{value.toLocaleString()}</div>
      <CardDescription>{description}</CardDescription>
    </Card>
  );
}
