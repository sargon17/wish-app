'use client'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface Props {
  id: string
}

export default function ProjectPage({ id }: Props) {
  const project = useQuery(api.projects.getProjectById, { id })
  return (
    <div>
      Project:
      {' '}
      {project?.title}
    </div>
  )
}
