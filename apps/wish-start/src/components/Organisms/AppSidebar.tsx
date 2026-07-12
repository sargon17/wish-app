import { Link, useLocation, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Cog,
  Home,
  LayoutDashboard,
  ListTodo,
  Mail,
  Plug,
  ScrollText,
} from "lucide-react";
import type { ReactNode } from "react";

import ProjectSettings from "@/components/project/ProjectSettings";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Menu items.
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Stats",
    url: "/dashboard/stats",
    icon: BarChart3,
  },
  {
    title: "Waitlist",
    url: "/dashboard/waitlist",
    icon: Mail,
  },
  {
    title: "MCP connection",
    url: "/dashboard/mcp",
    icon: Plug,
  },
];

const projectViews = [
  { title: "Requests", to: "/dashboard/project/$projectId/$slug/requests", icon: ListTodo },
  {
    title: "Complaints",
    to: "/dashboard/project/$projectId/$slug/complaints",
    icon: AlertTriangle,
  },
  {
    title: "Changelog",
    to: "/dashboard/project/$projectId/$slug/changelog",
    icon: ScrollText,
  },
] as const;

interface Props {
  footer?: ReactNode;
}

export function AppSidebar({ footer }: Props) {
  const { projectId, slug } = useParams({ strict: false });

  return (
    <Sidebar variant="floating" className="z-20">
      <SidebarContent>
        {projectId && slug ? <ProjectNav projectId={projectId} slug={slug} /> : <GlobalNav />}
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
    </Sidebar>
  );
}

function GlobalNav() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Wish App</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function ProjectNav({ projectId, slug }: { projectId: string; slug: string }) {
  const { pathname } = useLocation();
  const base = `/dashboard/project/${projectId}/${slug}`;

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/dashboard">
                  <ArrowLeft />
                  <span>Back to dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel className="capitalize">{slug.replaceAll("-", " ")}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {projectViews.map((view) => (
              <SidebarMenuItem key={view.title}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(`${base}/${view.to.split("/").at(-1)}`)}
                >
                  <Link to={view.to} params={{ projectId, slug }}>
                    <view.icon />
                    <span>{view.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <ProjectSettings projectID={projectId as never}>
                <SidebarMenuButton>
                  <Cog />
                  <span>Settings</span>
                </SidebarMenuButton>
              </ProjectSettings>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  );
}
