'use client'
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
}
export default function CreateProjectDialog({ children }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const createProject = useMutation(api.projects.createProject)

  async function handleSubmit(data: FormData) {
    try {
      const title = data.get('title')?.toString()
      if (!title)
        return
      await createProject({ title })
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
