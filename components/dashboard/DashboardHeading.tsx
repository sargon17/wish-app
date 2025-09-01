import CreateProjectDialog from '../project/CreateProjectDialog'
import { SidebarTrigger } from '../ui/sidebar'

interface Props {
  title: string
  actions: React.ReactNode
}
export default function DashboardHeading({ title, actions }: Props) {
  return (
    <div className="flex justify-between items-center pb-8">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-4xl font-bold capitalize">{title}</h1>
      </div>
      {actions}
    </div>
  )
}
