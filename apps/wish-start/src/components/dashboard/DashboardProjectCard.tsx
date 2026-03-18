import { Link } from '@tanstack/react-router'

import { sluggedText } from '@/lib/slug'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Project = { _id: string; title: string }

export default function DashboardProjectCard({ project }: { project: Project }) {
  return (
    <Card className="relative w-full py-4" key={project._id}>
      <Link
        to="/dashboard/project/$projectId/$slug"
        params={{ projectId: project._id, slug: sluggedText(project.title) }}
        className="absolute inset-0 z-0"
      />
      <CardHeader className="relative z-10 gap-1">
        <CardTitle className="capitalize">{project.title}</CardTitle>
        <CardDescription className="overflow-hidden text-ellipsis text-nowrap">{`ID: ${project._id}`}</CardDescription>
      </CardHeader>
    </Card>
  )
}
