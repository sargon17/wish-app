import { buildFilters, type Filter } from "#/lib/requestBoard/buildFilters";
import { Button } from "@components/ui/button";
import { useMemo } from "react";

type FilterListProps = {
  active: string;
  onChange: (filter: string) => void;
  filters?: readonly Filter[];
};

const FilterList = ({ active, onChange, filters }: FilterListProps) => {
  const fltr = useMemo(() => buildFilters(filters), [filters]);

  const handleClick = (filter: Filter) => {
    if (filter.value === active) return;
    onChange(filter.value);
  };

  if (fltr.length === 0) return null;

  return (
    <div className="flex gap-1">
      {fltr.map((filter) => (
        <Button
          key={filter.value}
          size="sm"
          variant={filter.value === active ? "default" : "outline"}
          onClick={() => handleClick(filter)}
          className="flex gap-1"
        >
          <span>{filter.label}</span>
          <span>{filter.count}</span>
        </Button>
      ))}
    </div>
  );
};

export default FilterList;
