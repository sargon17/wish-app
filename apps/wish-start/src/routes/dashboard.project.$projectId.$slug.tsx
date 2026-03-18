import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/project/$projectId/$slug')({
  component: ProjectDetails,
})

function ProjectDetails() {
  const { projectId, slug } = Route.useParams()

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-8">
      <section className="rounded-2xl border border-border/80 bg-background/70 p-6">
        <p className="text-sm text-muted-foreground">Project details route (migration placeholder)</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{slug}</h1>
        <p className="mt-2 text-xs text-muted-foreground">id: {projectId}</p>
      </section>
    </main>
  )
}
