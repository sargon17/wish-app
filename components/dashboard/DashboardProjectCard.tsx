import type { Doc } from '@/convex/_generated/dataModel'
import Link from 'next/link'
import { sluggedText } from '@/lib/slug'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '../ui/card'
import DashboardProjectCardActions from './DashboardProjectCardActions'

interface Props {
  project: Doc<'projects'>
}

export default function DashboardProjectCard({ project }: Props) {
  return (
    <Card
      className="w-full  relative"
      key={project._id}
    >
      <Link href={`dashboard/project/${project._id}/${sluggedText(project.title)}`} className="absolute inset-0 z-0" />
      <CardHeader>
        <CardTitle className=" capitalize">{project.title}</CardTitle>
        <CardDescription className="overflow-hidden text-ellipsis " onClick={e => e.stopPropagation()}>{project._id}</CardDescription>
        <CardAction>
          <DashboardProjectCardActions id={project._id} />
        </CardAction>
      </CardHeader>
      {/* <CardContent>
            </CardContent> */}
      {/* <CardFooter>
              <p>Card Footer</p>
            </CardFooter> */}
    </Card>
  )
}
