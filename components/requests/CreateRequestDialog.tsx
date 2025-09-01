'use client'
import type { Id } from '@/convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/convex/_generated/api'

interface Props {
  children: React.ReactNode
  project: Id<'projects'>
  status: Id<'requestStatuses'>
}

export default function CreateRequestDialog({ children, project, status }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const createRequest = useMutation(api.requests.create)

  async function handleSubmit(data: FormData) {
    try {
      const title = data.get('title')?.toString()
      if (!title)
        return
      await createRequest({ text: title, clientId: 'test', project, status })
      setIsOpen(false)
    }
    catch {
      throw new Error('Unable to create the project')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Give a name to your new project
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="My App" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
