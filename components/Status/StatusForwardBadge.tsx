import type { Id } from '@/convex/_generated/dataModel'
import type { UseRequestStatusReturn } from '@/hooks/useRequestStatus'
import { ChevronRight } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface StatusForwardBadgeProps { status: UseRequestStatusReturn }

export default function StatusForwardBadge({ status }: StatusForwardBadgeProps) {
  if (!status.state.current)
    return

  return (
    <div className="flex text-xs items-center gap-2 group text-secondary-foreground/50 hover:text-secondary-foreground transition-colors cursor-pointer">
      <DropdownMenu>

        <DropdownMenuTrigger>
          {status.state.current.displayName}
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuLabel>Change status to</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={status.state.current._id}
            onValueChange={val => status.methods.setById(val as Id<'requestStatuses'>)}
          >
            {status.state.statuses?.map(stat => (
              <DropdownMenuRadioItem
                key={stat._id}
                value={stat._id}
              >
                {stat.displayName}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={status.methods.setNext}
        className="-translate-x-4 opacity-0 group-hover:translate-0 group-hover:opacity-100 transition-all hover:bg-secondary rounded-sm p-1 cursor-pointer"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
