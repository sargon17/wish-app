'use client'
import type { Doc } from '@/convex/_generated/dataModel'
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
import RequestCreateEditDialog from './RequestCreateEditDialog'

interface Props {
  request: Doc<'requests'>
}
export default function RequestCardActions({ request }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const deleteProject = useMutation(api.requests.deleteRequest)

  const handleSubmit = () => {
    deleteProject({ id: request._id })
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
          <DropdownMenuItem onClick={() => { setIsEdit(true) }}>
            Edit
          </DropdownMenuItem>

          <DropdownMenuItem variant="destructive" onClick={() => { setIsOpen(true) }}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RequestCreateEditDialog method="edit" request={request} open={isEdit} onOpenChange={setIsEdit} />

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
