import { CalendarDays, SlidersHorizontal, X } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import type { Filter } from "@/lib/requestBoard/buildFilters";

import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Checkbox } from "../ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerNested,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const toDateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function RequestTableFilters({
  filters,
  hiddenFilters,
  createdFrom,
  createdTo,
  onHiddenFiltersChange,
  onDateRangeChange,
}: {
  filters: readonly Filter[];
  hiddenFilters: string[];
  createdFrom: string;
  createdTo: string;
  onHiddenFiltersChange: (filters: string[]) => void;
  onDateRangeChange: (from: string, to: string) => void;
}) {
  const isMobile = useIsMobile();
  const allStatusesSelected = hiddenFilters.length === 0;
  const activeFilterCount = hiddenFilters.length + (createdFrom ? 1 : 0) + (createdTo ? 1 : 0);
  const selectedRange = {
    from: createdFrom ? new Date(`${createdFrom}T00:00:00`) : undefined,
    to: createdTo ? new Date(`${createdTo}T00:00:00`) : undefined,
  };
  const dateLabel = selectedRange.from
    ? `${dateFormatter.format(selectedRange.from)}${selectedRange.to ? ` – ${dateFormatter.format(selectedRange.to)}` : ""}`
    : "Choose a date range";

  function toggleFilter(value: string) {
    const normalized = value.toLowerCase();
    onHiddenFiltersChange(
      hiddenFilters.includes(normalized)
        ? hiddenFilters.filter((item) => item !== normalized)
        : [...hiddenFilters, normalized],
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
          range?.from ? toDateValue(range.from) : "",
          range?.to ? toDateValue(range.to) : "",
        )
      }
    />
  );
  const dateTrigger = (
    <Button
      type="button"
      variant="outline"
      className="mt-3 w-full justify-start gap-2 font-normal shadow-none"
    >
      <CalendarDays className="size-4 text-muted-foreground" />
      <span className={!selectedRange.from ? "text-muted-foreground" : undefined}>{dateLabel}</span>
    </Button>
  );
  const body = (
    <>
      <fieldset>
        <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Status
        </legend>
        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-center gap-2 border-b pb-2 text-sm font-medium">
            <Checkbox
              checked={allStatusesSelected}
              onCheckedChange={() =>
                onHiddenFiltersChange(
                  allStatusesSelected ? filters.map((filter) => filter.value.toLowerCase()) : [],
                )
              }
            />
            <span className="flex-1">All statuses</span>
            <span className="text-xs text-muted-foreground">
              {filters.reduce((count, filter) => count + (filter.count ?? 0), 0)}
            </span>
          </label>
          {filters.map((filter) => (
            <label key={filter.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={!hiddenFilters.includes(filter.value.toLowerCase())}
                onCheckedChange={() => toggleFilter(filter.value)}
              />
              <span className="min-w-0 flex-1 truncate">{filter.label}</span>
              <span className="text-xs text-muted-foreground">{filter.count}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Created between
        </legend>
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
      </fieldset>
      {activeFilterCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => {
            onHiddenFiltersChange([]);
            onDateRangeChange("", "");
          }}
        >
          <X className="size-4" />
          Clear filters
        </Button>
      ) : null}
    </>
  );
  const trigger = (
    <Button type="button" variant="outline" className="gap-2 shadow-none">
      <SlidersHorizontal className="size-4" />
      Filters
      {activeFilterCount > 0 ? (
        <span className="rounded-full bg-orange-500 px-1.5 text-xs text-white">
          {activeFilterCount}
        </span>
      ) : null}
    </Button>
  );

  return isMobile ? (
    <Drawer>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="px-0">
          <DrawerTitle>Filter requests</DrawerTitle>
          <DrawerDescription>Choose statuses and a creation date range.</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto pb-1">{body}</div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-5">
        {body}
      </PopoverContent>
    </Popover>
  );
}
