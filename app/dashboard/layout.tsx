import { AppSidebar } from '@/components/Organisms/AppSidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

interface Props {
  children: React.ReactNode
}
export default function DashboardLayout({ children }: Readonly<Props>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="w-full p-6">
        {/* <SidebarTrigger /> */}
        {children}
      </main>
    </SidebarProvider>
  )
}
