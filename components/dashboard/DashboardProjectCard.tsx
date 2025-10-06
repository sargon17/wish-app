import type { Doc } from '@/convex/_generated/dataModel'
import { Copy } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { sluggedText } from '@/lib/slug'
import CopyButton from '../Organisms/CopyButton'
import { Button } from '../ui/button'
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
        <div className="overflow-hidden flex gap-2 items-center">
          <CardDescription className="overflow-hidden text-ellipsis text-nowrap" onClick={e => e.stopPropagation()}>
            {`ID: ${project._id}`}
          </CardDescription>
          <CopyButton text={project._id} />
        </div>
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
