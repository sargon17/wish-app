import type { ReactNode } from 'react'
import type { Doc } from '@/convex/_generated/dataModel'
import { User } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Props {
  children: ReactNode
  request: Doc<'requests'>
}

export default function RequestDetailView({ children, request }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild className="cursor-pointer">
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {request.text}
          </DialogTitle>
          <DialogDescription>
            {/* <div className="*:flex *:gap-2 flex gap-4">
              <div>
                <User size={18} />
                {request.clientId}
              </div>
              <div>
                <p>ID:</p>
                {request._id}
              </div>
            </div> */}
          </DialogDescription>
          <div>
            {request.description}
          </div>
        </DialogHeader>

        <DialogFooter>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
