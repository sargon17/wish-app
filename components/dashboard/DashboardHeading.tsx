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
    url?: string
    label: string
  }[]
}
export default function DashboardHeading({ title, actions, breadcrumbs }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full pb-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4 h-10">
          <SidebarTrigger />
          <Separator orientation="vertical" />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl md:text-4xl font-bold capitalize">{title}</h1>
          </div>
        </div>
        {actions}
      </div>
      <Separator />
      <Breadcrumb>
        <BreadcrumbList>
          {
            breadcrumbs.map(item => (
              <div key={item.url} className=" contents">
                <BreadcrumbItem>
                  <BreadcrumbLink href={item.url} className=" capitalize">{item.label}</BreadcrumbLink>
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
