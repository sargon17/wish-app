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
    <div className="group flex cursor-pointer items-center gap-2 text-xs text-secondary-foreground/50 transition-colors focus-within:text-secondary-foreground hover:text-secondary-foreground">
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Change request status">
          {status.state.current.displayName}
        </DropdownMenuTrigger>

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
        type="button"
        aria-label="Move request to next Status"
        onClick={status.methods.setNext}
        className="cursor-pointer rounded-sm p-1 hover:bg-secondary"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
