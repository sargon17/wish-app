import type { Id } from "@wish/convex-backend/data-model";
import { ChevronRight } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UseRequestStatusReturn } from "@/hooks/useRequestStatus";

interface StatusForwardBadgeProps {
  status: UseRequestStatusReturn;
}

export default function StatusForwardBadge({ status }: StatusForwardBadgeProps) {
  if (!status.state.current) return;

  return (
    <div className="group flex cursor-pointer items-center gap-2 text-xs text-secondary-foreground/50 transition-colors hover:text-secondary-foreground">
      <DropdownMenu>
        <DropdownMenuTrigger>{status.state.current.displayName}</DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuLabel>Change status to</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={status.state.current._id}
            onValueChange={(val) => status.methods.setById(val as Id<"requestStatuses">)}
          >
            {status.state.statuses?.map((stat) => (
              <DropdownMenuRadioItem key={stat._id} value={stat._id}>
                {stat.displayName}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={status.methods.setNext}
        className="-translate-x-4 cursor-pointer rounded-sm p-1 opacity-0 transition-all group-hover:translate-0 group-hover:opacity-100 hover:bg-secondary"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
