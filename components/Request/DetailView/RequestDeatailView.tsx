import type { ReactNode } from 'react'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { ChevronRight, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { findCurrentStatus } from '@/convex/services/queries/status/findCurrentStatus'
import { useRequestStatus } from '@/hooks/useRequestStatus'

interface Props {
  children: ReactNode
  request: Doc<'requests'>
}

export default function RequestDetailView({ children, request }: Props) {
  const [status, statuses, isStatusChanged, statusMethods] = useRequestStatus({ request })

  const handleSave = () => {
    statusMethods.save()
  }

  const isToSave = isStatusChanged

  return (
    <Dialog>
      <DialogTrigger asChild className="cursor-pointer">
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-4 ">
            <DialogTitle className="capitalize">
              {request.text}
            </DialogTitle>
            <div className="flex text-xs items-center gap-2 group text-secondary-foreground/20 hover:text-secondary-foreground transition-colors">
              {status && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      {status.displayName}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>

                      <DropdownMenuLabel>Change status to</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={status._id} onValueChange={val => statusMethods.setById(val as Id<'requestStatuses'>)}>
                        {statuses && statuses.map(stat => (
                          <DropdownMenuRadioItem key={stat._id} value={stat._id}>{stat.displayName}</DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <button
                    onClick={statusMethods.setNext}
                    className="-translate-x-4 opacity-0 group-hover:translate-0 group-hover:opacity-100 transition-all hover:bg-secondary rounded-sm p-1 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="*:flex *:gap-2 *:items-center flex gap-2 text-foreground/50 text-sm mb-8">
              <div>
                <User size={16} />
                {request.clientId}
              </div>
              <div className="text-foreground/20">
                /
              </div>
              <div>
                <p>ID:</p>
                {request._id}
              </div>
            </div>
            <div>
              <p className="text-secondary-foreground text-sm">
                {request.description}
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter>
          {
            isToSave
            && (
              <Button onClick={handleSave}>
                Save
              </Button>
            )
          }

        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
