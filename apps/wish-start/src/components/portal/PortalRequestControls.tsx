import type { Doc, Id } from "@wish/convex-backend/data-model";
import { CalendarDays, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerNested,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

const toDateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function PortalRequestControls({
  statuses,
  selectedStatuses,
  selectedSort,
  createdFrom,
  createdTo,
  onStatusesChange,
  onSortChange,
  onDateRangeChange,
}: {
  statuses: Doc<"requestStatuses">[];
  selectedStatuses: Id<"requestStatuses">[];
  selectedSort: "top" | "newest";
  createdFrom?: string;
  createdTo?: string;
  onStatusesChange: (statuses: Id<"requestStatuses">[]) => void;
  onSortChange: (sort: "top" | "newest") => void;
  onDateRangeChange: (from?: string, to?: string) => void;
}) {
  const isMobile = useIsMobile();
  const allStatusesSelected = selectedStatuses.length === statuses.length;
  const selectedRange = {
    from: createdFrom ? new Date(`${createdFrom}T00:00:00`) : undefined,
    to: createdTo ? new Date(`${createdTo}T00:00:00`) : undefined,
  };
  const dateLabel = selectedRange.from
    ? `${dateFormatter.format(selectedRange.from)}${selectedRange.to ? ` – ${dateFormatter.format(selectedRange.to)}` : ""}`
    : "Created anytime";

  function toggleStatus(statusId: Id<"requestStatuses">) {
    onStatusesChange(
      selectedStatuses.includes(statusId)
        ? selectedStatuses.filter((id) => id !== statusId)
        : [...selectedStatuses, statusId],
    );
  }

  const calendar = (
    <Calendar
      autoFocus
      mode="range"
      numberOfMonths={isMobile ? 1 : 2}
      selected={selectedRange}
      onSelect={(range) =>
        onDateRangeChange(
          range?.from ? toDateValue(range.from) : undefined,
          range?.to ? toDateValue(range.to) : undefined,
        )
      }
    />
  );
  const dateTrigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full justify-between shadow-none"
    >
      <span className="flex items-center gap-2">
        <CalendarDays className="size-4" />
        {dateLabel}
      </span>
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Status
        </legend>
        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-center gap-2 border-b pb-2 text-sm font-medium">
            <Checkbox
              checked={allStatusesSelected}
              onCheckedChange={() =>
                onStatusesChange(allStatusesSelected ? [] : statuses.map((status) => status._id))
              }
            />
            All statuses
          </label>
          {statuses.map((status) => (
            <label key={status._id} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={selectedStatuses.includes(status._id)}
                onCheckedChange={() => toggleStatus(status._id)}
              />
              {status.displayName}
            </label>
          ))}
        </div>
      </fieldset>

      {isMobile ? (
        <DrawerNested>
          <DrawerTrigger asChild>{dateTrigger}</DrawerTrigger>
          <DrawerContent className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="px-0">
              <DrawerTitle>Created between</DrawerTitle>
              <DrawerDescription>Select a start and end date.</DrawerDescription>
            </DrawerHeader>
            <div className="flex justify-center">{calendar}</div>
          </DrawerContent>
        </DrawerNested>
      ) : (
        <Popover>
          <PopoverTrigger asChild>{dateTrigger}</PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            {calendar}
          </PopoverContent>
        </Popover>
      )}
      {createdFrom || createdTo ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => onDateRangeChange()}>
          <X className="size-4" />
          Clear dates
        </Button>
      ) : null}

      <fieldset>
        <legend className="sr-only">Sort requests</legend>
        <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Rank by
        </p>
        <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
          {(["top", "newest"] as const).map((sort) => (
            <Button
              key={sort}
              type="button"
              variant="ghost"
              size="sm"
              className={
                selectedSort === sort
                  ? "bg-background shadow-sm hover:bg-background"
                  : "text-muted-foreground"
              }
              aria-pressed={selectedSort === sort}
              onClick={() => onSortChange(sort)}
            >
              {sort === "top" ? "Top voted" : "Newest"}
            </Button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
