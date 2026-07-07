import { Button } from "@components/ui/button";
import type { SortDirection } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { PropsWithChildren } from "react";

interface SortButtonProps extends PropsWithChildren {
  sort: false | SortDirection;
  onClick: () => void;
}

const SortButton = ({ children, onClick, sort }: SortButtonProps) => {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-3 cursor-pointer"
      onClick={() => onClick()}
    >
      {children}
      {(() => {
        switch (sort) {
          case "asc":
            return <ArrowDown />;
          case "desc":
            return <ArrowUp />;
          default:
            return <ArrowUpDown />;
        }
      })()}
    </Button>
  );
};

export default SortButton;
