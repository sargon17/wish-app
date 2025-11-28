import { Skeleton } from "@/components/ui/skeleton";

export function StatsLoading() {
  return (
    <div className="flex flex-col gap-6 sidebar-offset-pl">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton key={idx} className="h-24 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-72 w-full rounded-lg lg:col-span-7" />
        <Skeleton className="h-72 w-full rounded-lg lg:col-span-5" />
      </div>
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}
