import { cookies } from 'next/headers'
import { AppSidebar } from '@/components/Organisms/AppSidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

interface Props {
  children: React.ReactNode
}
export default async function DashboardLayout({ children }: Readonly<Props>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true'
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className=" overflow-hidden">
        <main className="h-screen py-2">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
