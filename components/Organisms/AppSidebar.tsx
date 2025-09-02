import { LayoutDashboard } from 'lucide-react'

import React from 'react'

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
} from '@/components/ui/sidebar'

// Menu items.
const items = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
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
]

interface Props {
  footer?: React.ReactNode
}

export function AppSidebar({ footer }: Props) {
  return (
    <Sidebar variant="floating">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Wish App</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {footer}
      </SidebarFooter>
    </Sidebar>
  )
}
