'use client'
import { useQuery } from 'convex/react'
import Link from 'next/link'
import CreateProjectDialog from '@/components/project/CreateProjectDialog'
import { api } from '@/convex/_generated/api'

export default function Dashboard() {
  const projects = useQuery(api.projects.getProjectsForUser)

  return (
    <div>
      <CreateProjectDialog />

      <div className="flex gap-4">
        {projects?.map(project => (
          <Link href={`dashboard/project/${project._id}`} key={project._id}>
            {project.title}
          </Link>
        ))}
      </div>

    </div>
  )
}
