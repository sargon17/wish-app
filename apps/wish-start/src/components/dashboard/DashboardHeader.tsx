import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

interface BreadcrumbItem {
  label: string
  to: string
}

interface Props {
  title: string
  actions?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

export default function DashboardHeader({ title, actions, breadcrumbs = [] }: Props) {
  return (
    <section className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm text-muted-foreground">
          {breadcrumbs.map((item, index) => (
            <span key={`${item.to}-${item.label}`}>
              {index > 0 ? ' / ' : ''}
              <Link to={item.to as never} className="hover:text-foreground">
                {item.label}
              </Link>
            </span>
          ))}
          {breadcrumbs.length ? ' / ' : ''}
          <span className="text-foreground">{title}</span>
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  )
}
