import { AppSidebar } from '@/components/Organisms/AppSidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

interface Props {
  children: React.ReactNode
}
export default function DashboardLayout({ children }: Readonly<Props>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className=" overflow-hidden">
        <main className="h-screen py-2">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
