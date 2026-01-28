import { cookies } from "next/headers";

import { AppSidebar } from "@/components/Organisms/AppSidebar";
import ThemeTabs from "@/components/Organisms/ThemeTabs";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";

import { StatusesStoreProvider } from "../providers/StatusesStoreProvider";

interface Props {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: Readonly<Props>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <StatusesStoreProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar
          footer={
            <div className="flex justify-between">
              <ThemeTabs />
              <UserButton />
            </div>
          }
        />
        <SidebarInset className="overflow-hidden">
          <div className="gradient-homepage fixed inset-0 z-0"></div>
          <main className="h-screen relative z-10">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </StatusesStoreProvider>
  );
}
