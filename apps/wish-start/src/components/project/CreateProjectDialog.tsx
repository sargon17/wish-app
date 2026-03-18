import { type } from 'arktype'
import { useMutation } from 'convex/react'
import { AlertTriangle, KeyRound } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { SubmitHandler } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import CopyButton from '@/components/Organisms/CopyButton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'

import { api } from '@wish/convex-backend/api'
import { arktypeResolver } from '@hookform/resolvers/arktype'

interface Props {
  children: ReactNode
}

export default function CreateProjectDialog({ children }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [createdApiKey, setCreatedApiKey] = useState('')
  const createProject = useMutation(api.projects.createProject)
  const schema = type({
    title: 'string > 2',
  })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<typeof schema.infer>({
    resolver: arktypeResolver(schema),
    mode: 'onBlur',
  })

  const onSubmit: SubmitHandler<typeof schema.infer> = async ({ title }) => {
    try {
      const result = await createProject({ title })

      if (result.apiKey) {
        setCreatedApiKey(result.apiKey)
        toast.success('Project created. API key ready.')
        return
      }

      toast.success('Project created')
      reset()
      setIsOpen(false)
    } catch (error) {
      console.error(error)
      toast.error('Unable to create the project')
      throw new Error('Unable to create the project')
    }
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open)

    if (!open) {
      setCreatedApiKey('')
      reset()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {createdApiKey ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Project API key</DialogTitle>
              <DialogDescription>This key is shown once right after project creation.</DialogDescription>
            </DialogHeader>
            <Alert>
              <KeyRound className="size-4" />
              <AlertTitle>Save this key now</AlertTitle>
              <AlertDescription>
                The raw key is not stored. If you lose it, regenerate it from project settings.
              </AlertDescription>
            </Alert>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>API key</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput value={createdApiKey} readOnly />
              <InputGroupAddon align="inline-end">
                <CopyButton text={createdApiKey} variant="input-button" />
              </InputGroupAddon>
            </InputGroup>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setCreatedApiKey('')
                  reset()
                  setIsOpen(false)
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Give a name to your new project</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <Label htmlFor="project-title">Title</Label>
              <Input
                id="project-title"
                {...register('title')}
                aria-invalid={Boolean(errors.title)}
                placeholder="Wish mobile app"
              />
              {errors.title ? (
                <p className="flex gap-2 text-xs text-red-500">
                  <AlertTriangle size={16} />
                  {errors.title.message}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
