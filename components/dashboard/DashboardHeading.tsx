import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '../ui/sidebar'

interface Props {
  title: string
  actions: React.ReactNode
  breadcrumbs: {
    url: string
    label: string
  }[]
}
export default function DashboardHeading({ title, actions, breadcrumbs }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full pb-6">
      <div className="flex items-center justify-between gap-4 max-md:px-2 overflow-hidden">
        <div className="flex items-center gap-4 h-10 min-w-0 flex-1">
          <SidebarTrigger />
          <Separator orientation="vertical" />
          <h1 className="flex-1 min-w-0 truncate text-2xl md:text-4xl font-bold capitalize">{title}</h1>
        </div>
        <div className="flex shrink-0 flex-none">
          {actions}
        </div>
      </div>
      <Separator />
      <Breadcrumb className="max-md:px-2">
        <BreadcrumbList>
          {
            breadcrumbs.map(item => (
              <div key={item.url} className=" contents">
                <BreadcrumbItem>
                  <BreadcrumbLink className="capitalize" asChild>
                    <Link href={item.url}>
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </div>
            ))
          }
          {/* <BreadcrumbItem>
            <BreadcrumbLink href="/components">Components</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator /> */}
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  )
}
