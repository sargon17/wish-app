'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useMutation } from 'convex/react'

const waitlistSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .pipe(z.email('Enter a valid email')),
})

type WaitlistFormValues = z.infer<typeof waitlistSchema>

interface WaitlistJoinProps extends React.ComponentProps<'div'> {
  buttonLabel?: string
  description?: string
  successMessage?: string
  placeholder?: string
  onSuccess?: () => void
}

export function WaitlistJoin({
  className,
  buttonLabel = 'Join the waitlist',
  description = 'We only reach out when we launch. No spam, ever.',
  successMessage = 'You\'re on the list. We\'ll keep you posted.',
  placeholder = 'you@example.com',
  onSuccess,
  ...props
}: WaitlistJoinProps) {
  const joinWaitlist = useMutation(api.waitlist.join)

  const form = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { email: '' },
    mode: 'onChange',
  })

  const handleSubmit = async (values: WaitlistFormValues) => {

    try {
      await joinWaitlist({ email: values.email })
      toast.success(successMessage)
      form.reset()
      onSuccess?.()
    }
    catch (error) {
      console.error(error)
      const fallbackMessage = 'Unable to join the waitlist right now. Please try again.'
      const message = error instanceof Error && error.message ? error.message : fallbackMessage

      toast.error(message)
    }
  }

  return (
    <div className={cn('flex w-full flex-col items-center', className)} {...props}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="w-full sm:flex-1">
                <FormControl>
                  <Input
                    type="email"
                    placeholder={placeholder}
                    className="h-12 rounded-lg bg-white/80 text-base shadow-xs backdrop-blur"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="h-12 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={form.formState.isSubmitting || !form.formState.isValid}
          >
            {form.formState.isSubmitting ? 'Joining...' : buttonLabel}
          </Button>
        </form>
      </Form>
      {description && (
        <p className="mt-3 w-full text-center text-sm text-muted-foreground">
          {description}
        </p>
      )}

    </div>
  )
}
