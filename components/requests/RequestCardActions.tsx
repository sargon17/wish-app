'use client'
import type { Id } from '@/convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { api } from '@/convex/_generated/api'

import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'

interface Props {
  id: Id<'requests'>
}
export default function RequestCardActions({ id }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const deleteProject = useMutation(api.requests.deleteRequest)

  const handleSubmit = () => {
    deleteProject({ id })
    setIsOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="relative z-10" asChild>
          <Button variant="ghost" size="icon" className="opacity-0 group-hover/request-card:opacity-100 transition-all">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => { setIsOpen(true) }}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form action={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Delete Request</DialogTitle>
              <DialogDescription>
                This action is final and irreversible
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="destructive">Delete</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
