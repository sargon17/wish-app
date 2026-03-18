import { Link, createFileRoute } from '@tanstack/react-router'
import { Authenticated, Unauthenticated } from 'convex/react'
import { Clock3, ShieldCheck, Sparkles } from 'lucide-react'

import { Chip } from '@/components/atoms/chip'
import { HighlightCard } from '@/components/molecules/HighlightCard'
import { WaitlistJoin } from '@/components/Organisms/WaitlistJoin'
import { Button } from '@/components/ui/button'
import { useStoreUserEffect } from '@/hooks/useStoreUserEffect'
import { SignInButton, UserButton } from '@clerk/clerk-react'

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
  const { isAuthenticated } = useStoreUserEffect()

  return (
    <div className="min-h-[300vh] bg-background text-foreground">
      <div className="fixed inset-0 z-0 gradient-homepage" />

      <header className="sticky top-0 z-10 border-b border-b-background/40 bg-background/20 pb-4 pt-4 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-accent/10 text-sm font-semibold text-accent-foreground">
              Wi
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">Wish</p>
              <p className="text-sm text-muted-foreground">Wishlist, simplified.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Authenticated>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
              <UserButton />
            </Authenticated>
            <Unauthenticated>
              <SignInButton mode="modal">
                <Button variant="ghost">Sign in</Button>
              </SignInButton>
            </Unauthenticated>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl pb-16">
        <section className="relative px-6 py-12 md:py-16">
          <div className="relative mx-auto my-30 flex flex-col items-center text-center">
            <Chip color="accent" size="md">
              Early access open
            </Chip>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-7xl">
              Ship what customers ask for{" "}
              <span className="text-accent-foreground">without the chaos</span>
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
              Wish turns scattered requests into a clear, prioritized wishlist your team can ship
              from. Join the waitlist for early access.
            </p>

            <WaitlistJoin
              className="mt-8 max-w-3xl"
              buttonLabel="Get early access"
              description="One email at launch. No spam."
              placeholder="you@company.com"
            />
            {isAuthenticated ? (
              <p className="mt-4 text-sm text-muted-foreground">
                You&apos;re signed in. The dashboard is ready whenever you are.
              </p>
            ) : null}
          </div>

          <div className="relative mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {highlights.map((item) => (
              <HighlightCard
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
                tone="soft"
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
