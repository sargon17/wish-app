'use client'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function Dashboard() {
  const projects = useQuery(api.projects.getProjectsForUser)
  const createProject = useMutation(api.projects.createProject)

  const handleCreateProject = async () => {
    await createProject({ title: 'default' })
  }
  return (
    <div>
      Dashboard

      <button
        onClick={() => handleCreateProject()}
      >
        create project
      </button>

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
