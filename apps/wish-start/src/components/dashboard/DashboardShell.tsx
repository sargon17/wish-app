"use client";

import type { ReactNode } from "react";

import { AppSidebar } from "@/components/Organisms/AppSidebar";
import ThemeTabs from "@/components/Organisms/ThemeTabs";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/clerk-react";

import { StatusesStoreProvider } from "@/providers/StatusesStoreProvider";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <StatusesStoreProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar
          footer={
            <div className="flex justify-between">
              <ThemeTabs />
              <UserButton />
            </div>
          }
        />
        <SidebarInset className="overflow-hidden">
          <div className="gradient-homepage fixed inset-0 z-0" />
          <main className="relative z-10 h-screen">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </StatusesStoreProvider>
  );
}
