'use client'
import type { PropsWithChildren } from 'react'
import type { Id } from '@/convex/_generated/dataModel'
import { useQuery } from 'convex/react'
import { hex } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from '@/components/ui/shadcn-io/color-picker'

import { api } from '@/convex/_generated/api'

import CopyButton from '../Organisms/CopyButton'
import { Badge } from '../ui/badge'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from '../ui/input-group'

interface ProjectSettingsProps extends PropsWithChildren {
  projectID: Id<'projects'>
}

export default function ProjectSettings({ children, projectID }: ProjectSettingsProps) {
  const project = useQuery(api.projects.getProjectById, { id: projectID })
  const requestStatuses = useQuery(api.requestStatuses.getByProject, { id: projectID })

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[80vw]">
        <DialogHeader>
          <DialogTitle>{project?.title}</DialogTitle>
        </DialogHeader>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>
              ID
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput value={`${project?._id}`} disabled={true} />
          <InputGroupAddon align="inline-end">
            <CopyButton text={project?._id ?? ''} variant="input-button" />
          </InputGroupAddon>
        </InputGroup>
        <h3>
          Statuses
        </h3>
        <ul className="gap-2 flex flex-wrap">
          {requestStatuses && requestStatuses.map(status => (
            <Popover>
              <PopoverTrigger>
                <Badge variant="secondary">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color ?? 'red' }}>

                  </div>
                  {status.displayName}
                </Badge>
              </PopoverTrigger>
              <PopoverContent>
                <ColorPicker className="max-w-sm rounded-md border bg-background p-4 shadow-sm h-80">
                  <ColorPickerSelection />
                  <div className="flex items-center gap-4">
                    <ColorPickerEyeDropper />
                    <div className="grid w-full gap-1">
                      <ColorPickerHue />
                      <ColorPickerAlpha />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ColorPickerOutput />
                    <ColorPickerFormat />
                  </div>
                </ColorPicker>
              </PopoverContent>
            </Popover>
          ),
          )}
        </ul>

      </DialogContent>
    </Dialog>
  )
}
