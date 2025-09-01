'use client'
import { useQuery } from 'convex/react'
import { Ellipsis } from 'lucide-react'
import Link from 'next/link'
import CreateProjectDialog from '@/components/project/CreateProjectDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/convex/_generated/api'
import { Button } from '../ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { SidebarTrigger } from '../ui/sidebar'

export default function DashboardView() {
  const projects = useQuery(api.projects.getProjectsForUser)

  return (
    <div>
      <div className="flex justify-between items-center pb-8">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-4xl font-bold">Projects</h1>
        </div>
        <CreateProjectDialog />
      </div>

      <div className="grid gap-4 grid-cols-4">
        {projects?.map(project => (
          <Card
            className="w-full min-w-60 relative"
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
        ))}
      </div>

    </div>
  )
}
