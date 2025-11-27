'use client'

import { SignInButton, UserButton } from '@clerk/nextjs'
import { Authenticated, Unauthenticated } from 'convex/react'
import { Sparkles, ShieldCheck, Clock3 } from 'lucide-react'
import Link from 'next/link'

import { WaitlistJoin } from '@/components/Organisms/WaitlistJoin'
import { HighlightCard } from '@/components/molecules/HighlightCard'
import { Button } from '@/components/ui/button'
import { useStoreUserEffect } from '@effects/useStoreUserEffect'
import { Chip } from '@/components/atoms/chip'

const highlights = [
  {
    icon: Sparkles,
    title: 'Collect ideas fast',
    description: 'Capture requests without friction and keep focus on what matters.',
  },
  {
    icon: ShieldCheck,
    title: 'Stay organized',
    description: 'A clean backlog that keeps teams aligned and stakeholders calm.',
  },
  {
    icon: Clock3,
    title: 'Ship on time',
    description: 'See priorities at a glance so you can deliver without the scramble.',
  },
]

export default function Home() {
  const { isAuthenticated } = useStoreUserEffect()

  return (
    <div className="min-h-screen text-neutral-900">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `
              radial-gradient(125% 125% at 50% 10%, #ffffff 40%, #ffedd5 100%)
            `,
            backgroundSize: "100% 100%",
          }}
        />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pb-8 pt-10 relative z-10">
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
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
            <UserButton afterSignOutUrl="/" />
          </Authenticated>
          <Unauthenticated>
            <SignInButton mode="modal">
              <Button variant="ghost">Sign in</Button>
            </SignInButton>
          </Unauthenticated>
        </div>
      </header>

      <main className="mx-auto max-w-6xl pb-16">
        <section className="relative px-6 py-12 md:py-16">
          <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
            <Chip color='accent' size="md" >
              Waitlist now open
            </Chip>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
              A calmer way to collect and ship every wish
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Wish keeps your product requests organized, prioritized, and ready to build. Join the
              waitlist and be first to try it.
            </p>

            <WaitlistJoin className="mt-8" />
            {isAuthenticated && (
              <p className="mt-4 text-sm text-muted-foreground">
                You&apos;re signed in — the dashboard is ready whenever you are.
              </p>
            )}
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
