'use client'
import { useQuery } from 'convex/react'
import CreateProjectDialog from '@/components/project/CreateProjectDialog'
import { api } from '@/convex/_generated/api'

export default function Dashboard() {
  const projects = useQuery(api.projects.getProjectsForUser)

  return (
    <div>
      <CreateProjectDialog />

      <div>
        {projects?.map(project => (
          <div key={project._id}>
            {project.title}
          </div>
        ))}
      </div>

    </div>
  )
}
