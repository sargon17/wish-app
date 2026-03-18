import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({ component: Dashboard })

function Dashboard() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-16 pt-10">
      <section className="rounded-3xl border border-border/80 bg-background/70 p-8 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Dashboard route placeholder
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">Dashboard migration in progress</h1>
        <p className="mt-3 text-muted-foreground">
          Next commit will bring over the actual dashboard modules and providers from the Next.js app.
        </p>
      </section>
    </main>
  )
}
