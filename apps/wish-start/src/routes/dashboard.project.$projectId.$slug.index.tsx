import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/project/$projectId/$slug/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/dashboard/project/$projectId/$slug/requests',
      params,
    })
  },
})
