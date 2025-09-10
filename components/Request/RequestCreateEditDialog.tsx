'use client'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { type } from 'arktype'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/convex/_generated/api'

interface Props extends React.ComponentProps<typeof Dialog> {
  method?: 'create' | 'edit'
  request?: Doc<'requests'>
  children?: React.ReactNode
  project?: Id<'projects'>
  status?: Id<'requestStatuses'>
}

export default function RequestCreateEditDialog({
  method = 'create',
  request,
  children,
  project,
  status,
  open,
  onOpenChange,
}: Props) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const createRequest = useMutation(api.requests.create)
  const editRequest = useMutation(api.requests.edit)
  const statuses = useQuery(api.requestStatuses.getByProject, { id: (project || request?.project)! })

  const ArkSchema = type({
    title: '0 < string < 120',
    description: 'string < 1000 | undefined',
    status: 'string > 0',
  })

  const isEditMode = method === 'edit' && request

  const setDefaultStatus = (() => {
    if (isEditMode) {
      return request.status
    }

    if (!status && statuses && statuses[0]) {
      return statuses[0]._id
    }

    return status || ''
  })()

  const form = useForm<typeof ArkSchema.infer>({
    resolver: arktypeResolver(ArkSchema),
    defaultValues: {
      title: isEditMode ? request.text : '',
      description: isEditMode ? request.description : '',
      status: setDefaultStatus,
    },
    mode: 'onChange',
  })

  const { handleSubmit, reset } = form

  async function onSubmit(values: typeof ArkSchema.infer) {
    try {
      const description = values.description && values.description.length > 0 ? values.description : ''
      if (method === 'create' && project) {
        await createRequest({
          text: values.title,
          description,
          clientId: 'test',
          project,
          status: values.status as Id<'requestStatuses'>,
        })
      }
      else if (method === 'edit' && request) {
        await editRequest({
          text: values.title,
          description,
          status: values.status as Id<'requestStatuses'>,
          id: request._id,
        })
      }
      setIsOpen(false)
      reset()
    }
    catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (!isOpen)
      reset()
  }, [isOpen])

  return (
    <Dialog open={open === undefined ? isOpen : open} onOpenChange={onOpenChange === undefined ? setIsOpen : onOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form
          {...form}

        >
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>
                {
                  isEditMode ? 'Edit Request' : 'Create New Request'
                }
              </DialogTitle>
              <DialogDescription>
                Give a name and optional description
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="My App" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional details..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>
                      Status
                    </FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={v => field.onChange(v as Id<'requestStatuses'>)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses && statuses.map(status => (
                            <SelectItem key={status._id} value={status._id}>
                              {status.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage>
                      {fieldState.error?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">
                {isEditMode ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
