import { Link } from "@tanstack/react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

import { SidebarTrigger } from "../ui/sidebar";

interface Props {
  title: string;
  actions?: React.ReactNode;
  breadcrumbs: {
    url: string;
    label: string;
  }[];
}
export default function DashboardHeading({ title, actions, breadcrumbs }: Props) {
  return (
    <div className="sticky top-0 z-50 flex w-full flex-col gap-3 pb-2 backdrop-blur-2xl md:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pr-2 sidebar-offset-pl md:flex-nowrap md:gap-4 md:pr-6">
        <div className="flex h-10 min-w-0 flex-1 items-center gap-4">
          <SidebarTrigger />
          <Separator orientation="vertical" />
          <h1 className="min-w-0 flex-1 truncate text-2xl font-bold capitalize md:text-4xl">
            {title}
          </h1>
        </div>
        <div className="order-2 flex w-full min-w-0 overflow-x-auto pb-1 md:order-none md:w-auto md:flex-none md:shrink-0 md:overflow-visible md:pb-0">
          {actions}
        </div>
      </div>
      <Separator />
      <Breadcrumb className="sidebar-offset-pl max-md:px-2 md:pr-6">
        <BreadcrumbList>
          {breadcrumbs.map((item) => (
            <div key={item.url} className=" contents">
              <BreadcrumbItem>
                <BreadcrumbLink className="capitalize" asChild>
                  <Link to={item.url}>{item.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </div>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
