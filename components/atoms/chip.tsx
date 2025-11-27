import type { VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const chipVariants = cva(
  'inline-flex items-center gap-2 rounded-full border font-medium w-fit whitespace-nowrap shrink-0 transition-colors shadow-xs backdrop-blur outline-none [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      color: {
        accent: 'border-accent/40 bg-accent/10 text-accent-foreground',
        neutral: 'border-neutral-200 bg-neutral-50 text-neutral-800',
        muted: 'border-neutral-200/70 bg-muted text-muted-foreground',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      },
      size: {
        sm: 'px-2.5 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base',
      },
    },
    defaultVariants: {
      color: 'accent',
      size: 'md',
    },
  },
)

type ChipProps = React.ComponentProps<'span'>
  & VariantProps<typeof chipVariants> & { asChild?: boolean }

function Chip({
  className,
  color,
  size,
  asChild = false,
  ...props
}: ChipProps) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="chip"
      className={cn(chipVariants({ color, size }), className)}
      {...props}
    />
  )
}

export { Chip, chipVariants }
