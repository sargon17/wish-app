import { UserButton } from '@clerk/nextjs'
import { cookies } from 'next/headers'
import { AppSidebar } from '@/components/Organisms/AppSidebar'
import ThemeTabs from '@/components/Organisms/ThemeTabs'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

interface Props {
  children: React.ReactNode
}
export default async function DashboardLayout({ children }: Readonly<Props>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true'
  // Theme handled client-side by next-themes

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar footer={(
        <div className="flex justify-between">
          <ThemeTabs />
          <UserButton />
        </div>
      )}
      />
      <SidebarInset className=" overflow-hidden">
        <main className="h-screen py-2">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
