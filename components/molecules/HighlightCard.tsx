import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const cardVariants = cva(
  'flex h-full flex-col gap-3 rounded-2xl border p-4 text-left shadow-xs backdrop-blur',
  {
    variants: {
      tone: {
        soft: 'border-neutral-200 bg-white/70',
        muted: 'border-neutral-200/70 bg-neutral-50',
        accent: 'border-accent/30 bg-accent/5',
      },
    },
    defaultVariants: {
      tone: 'accent',
    },
  },
)

const iconVariants = cva(
  'flex h-10 w-10 items-center justify-center rounded-xl',
  {
    variants: {
      tone: {
        accent: 'bg-accent/10 text-accent-foreground',
        muted: 'bg-neutral-100 text-neutral-700',
        soft: 'bg-accent/15 text-accent-foreground',
      },
    },
    defaultVariants: {
      tone: 'accent',
    },
  },
)

type HighlightCardProps = React.ComponentProps<'div'>
  & VariantProps<typeof cardVariants> & {
    icon: React.ElementType
    title: string
    description: string
  }

export function HighlightCard({
  icon: Icon,
  title,
  description,
  tone,
  className,
  ...props
}: HighlightCardProps) {
  return (
    <div className={cn(cardVariants({ tone }), className)} {...props}>
      <div className={iconVariants({ tone })}>
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-neutral-900">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
