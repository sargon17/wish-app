"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { Sparkles, ShieldCheck, Clock3 } from "lucide-react";
import Link from "next/link";

import { Chip } from "@/components/atoms/chip";
import { HighlightCard } from "@/components/molecules/HighlightCard";
import { WaitlistJoin } from "@/components/Organisms/WaitlistJoin";
import { Button } from "@/components/ui/button";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { useStoreUserEffect } from "@effects/useStoreUserEffect";

const highlights = [
  {
    icon: Sparkles,
    title: "Capture every request",
    description: "Pull feedback into one wishlist so nothing slips through the cracks.",
  },
  {
    icon: ShieldCheck,
    title: "Prioritize with confidence",
    description: "Turn noise into a clear ranking so the next sprint is obvious.",
  },
  {
    icon: Clock3,
    title: "Ship the right thing",
    description: "Align stakeholders and deliver updates customers actually asked for.",
  },
];

const steps = [
  {
    title: "Collect",
    description: "Drop every request into one shared wishlist so nothing gets lost.",
  },
  {
    title: "Rank",
    description: "Sort by impact to keep priorities clear and defensible.",
  },
  {
    title: "Ship",
    description: "Build with confidence and close the loop with customers.",
  },
];

const beforeAfter = [
  {
    title: "Before Wish",
    points: [
      "Requests scattered across inboxes, docs, and threads",
      "Sprints driven by the loudest voice",
      "Stakeholders unclear on what ships next",
    ],
  },
  {
    title: "After Wish",
    points: [
      "One wishlist everyone can trust",
      "Priorities ranked by impact",
      "Updates shipped with clear buy-in",
    ],
  },
];

const audiences = [
  "Product teams juggling constant requests",
  "Founders validating what to build next",
  "Customer success teams closing feedback loops",
  "PMs who need a clean, shareable roadmap",
];

export default function Home() {
  const { isAuthenticated } = useStoreUserEffect();

  return (
    <div className="min-h-[300vh] bg-background text-foreground">
      <div className="fixed inset-0 z-0 gradient-homepage" />

      <header className=" pb-4 pt-4 z-10 sticky top-0 bg-background/20 backdrop-blur-lg border-b border-b-background/40">
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl pb-16">
        <section className="relative px-6 py-12 md:py-16">
          <div className="relative mx-auto flex flex-col items-center text-center my-30">
            <Chip color="accent" size="md">
              Early access open
            </Chip>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-7xl">
              Ship what customers ask for{" "}
              <span className="text-accent-foreground">without the chaos</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
              Wish turns scattered requests into a clear, prioritized wishlist your team can ship
              from. Join the waitlist for early access.
            </p>

            <WaitlistJoin
              className="mt-8 max-w-3xl"
              buttonLabel="Get early access"
              description="One email at launch. No spam."
              placeholder="you@company.com"
            />
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

          <div className="mt-16 grid gap-10 sm:gap-12 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                How it works
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">
                From request to shipped update in three steps
              </h2>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                Keep everything visible, rank what matters most, and ship with confidence.
              </p>
              <div className="mt-8 space-y-6">
                {steps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex items-start gap-4 border-l-2 border-accent/40 pl-4"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent-foreground">
                      {index + 1}
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-foreground">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex h-full flex-col justify-between rounded-3xl bg-gradient-to-br from-background/80 via-background/30 to-background/80 p-6 shadow-sm backdrop-blur">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Wishlist snapshot</p>
                <p className="text-sm text-muted-foreground">
                  A quick view of what matters now, next, and later.
                </p>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-background/70 px-4 py-3 shadow-xs">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Top requests
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Public roadmap, better analytics, faster onboarding
                  </p>
                </div>
                <div className="rounded-2xl bg-background/70 px-4 py-3 shadow-xs">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Next up
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Roles, tagging, and customer follow-ups
                  </p>
                </div>
                <div className="rounded-2xl bg-background/70 px-4 py-3 shadow-xs">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Shipped
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Request triage, prioritization view, status updates
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            {beforeAfter.map((block) => (
              <div
                key={block.title}
                className="rounded-3xl bg-background/40 p-6 shadow-xs backdrop-blur"
              >
                <p className="text-sm font-semibold text-foreground">{block.title}</p>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {block.points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent/70" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-3xl bg-background/40 p-6 shadow-xs backdrop-blur sm:p-8">
            <div className="flex flex-col gap-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Built for focus
              </p>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Made for teams living in feedback loops
              </h2>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {audiences.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-background/70 px-4 py-2 text-sm text-muted-foreground shadow-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-16 rounded-3xl bg-gradient-to-b from-background/70 to-background/40 p-6 text-center shadow-sm backdrop-blur sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Be first in line
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">
              Turn feedback into a wishlist you can actually ship
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Join the waitlist now and start with a calmer backlog from day one.
            </p>
            <WaitlistJoin
              className="mt-6 max-w-2xl"
              buttonLabel="Join the waitlist"
              description="No spam. Just a launch note and early access."
              placeholder="you@company.com"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
