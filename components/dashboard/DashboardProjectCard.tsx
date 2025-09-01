import type { Doc } from '@/convex/_generated/dataModel'
import { Ellipsis } from 'lucide-react'
import Link from 'next/link'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'

interface Props {
  project: Doc<'projects'>
}

export default function DashboardProjectCard({ project }: Props) {
  return (
    <Card
      className="w-full  relative"
      key={project._id}
    >
      <Link href={`dashboard/project/${project._id}`} className="absolute inset-0 z-0" />
      <CardHeader>
        <CardTitle className=" capitalize">{project.title}</CardTitle>
        {/* <CardDescription>{project.user}</CardDescription> */}
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger className="relative z-10">
              <Ellipsis />
              {/* <Button variant="ghost">
                    </Button> */}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
