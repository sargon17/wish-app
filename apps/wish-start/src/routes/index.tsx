import { Link, createFileRoute } from '@tanstack/react-router'
import { Clock3, ShieldCheck, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

const highlights = [
  {
    icon: Sparkles,
    title: 'Capture every request',
    description: 'Pull feedback into one wishlist so nothing slips through the cracks.',
  },
  {
    icon: ShieldCheck,
    title: 'Prioritize with confidence',
    description: 'Turn noise into a clear ranking so the next sprint is obvious.',
  },
  {
    icon: Clock3,
    title: 'Ship the right thing',
    description: 'Align stakeholders and deliver updates customers actually asked for.',
  },
]

function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-16 pt-10">
      <section className="relative py-10 md:py-14">
        <div className="fixed inset-0 -z-10 gradient-homepage" />

        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="rounded-full border border-orange-200 bg-orange-100/80 px-4 py-1 text-sm text-orange-600 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-300">
            Migration preview
          </p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Ship what customers ask for
            <span className="text-accent-foreground"> without the chaos</span>
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            Wish turns scattered requests into a clear, prioritized wishlist your team can ship
            from.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">Open dashboard preview</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://github.com/sargon17/wish-app/pull/9" target="_blank" rel="noreferrer">
                View migration PR
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon
            return (
              <article
                key={item.title}
                className="rounded-2xl border border-border/80 bg-background/55 p-5 shadow-xs backdrop-blur"
              >
                <Icon className="h-5 w-5 text-accent-foreground" />
                <h2 className="mt-3 text-base font-semibold text-foreground">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
