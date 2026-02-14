import { BarChart3, Home, LayoutDashboard, Mail } from "lucide-react";
import Link from "next/link";
import React from "react";

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
  // {
  //   title: 'Inbox',
  //   url: '#',
  //   icon: Inbox,
  // },
  // {
  //   title: 'Calendar',
  //   url: '#',
  //   icon: Calendar,
  // },
  // {
  //   title: 'Search',
  //   url: '#',
  //   icon: Search,
  // },
  // {
  //   title: 'Settings',
  //   url: '#',
  //   icon: Settings,
  // },
];

interface Props {
  footer?: React.ReactNode;
}

export function AppSidebar({ footer }: Props) {
  return (
    <Sidebar variant="floating" className="z-20">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Wish App</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{footer}</SidebarFooter>
    </Sidebar>
  );
}
