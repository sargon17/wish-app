"use client";

import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import * as v from "valibot";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { valibotResolver } from "@hookform/resolvers/valibot";

// const waitlistSchema = z.object({
//   email: z
//     .string()
//     .trim()
//     .min(3, 'Email is required')
//     .pipe(z.email('Enter a valid email')),
// })
//
const waitlistSchema = v.object({
  email: v.pipe(
    v.string(),
    v.email("Use a valid email address"),
    v.minLength(3, "Email is required"),
  ),
});

type WaitlistFormValues = v.InferInput<typeof waitlistSchema>;

interface WaitlistJoinProps extends React.ComponentProps<"div"> {
  buttonLabel?: string;
  description?: string;
  successMessage?: string;
  placeholder?: string;
  onSuccess?: () => void;
}

export function WaitlistJoin({
  className,
  buttonLabel = "Join the waitlist",
  description = "We only reach out when we launch. No spam, ever.",
  successMessage = "You're on the list. We'll keep you posted.",
  placeholder = "you@example.com",
  onSuccess,
  ...props
}: WaitlistJoinProps) {
  const joinWaitlist = useMutation(api.waitlist.join);

  const form = useForm<WaitlistFormValues>({
    resolver: valibotResolver(waitlistSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  const emailValue = form.watch("email");
  const isButtonDisabled = form.formState.isSubmitting || !emailValue.trim();

  const handleSubmit = async (values: WaitlistFormValues) => {
    try {
      await joinWaitlist({ email: values.email });
      toast.success(successMessage);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error(error);
      const fallbackMessage = "Unable to join the waitlist right now. Please try again.";
      const messageFromValidation = error instanceof v.ValiError ? error.issues[0]?.message : null;
      const messageFromError = error instanceof Error && error.message ? error.message : null;
      const message = messageFromValidation || messageFromError || fallbackMessage;

      toast.error(message);
      form.setError("email", { type: "manual", message });
    }
  };

  const handleInvalid = (errors: FieldErrors<WaitlistFormValues>) => {
    const firstError = Object.values(errors)[0];
    const message =
      typeof firstError?.message === "string"
        ? firstError.message
        : "Please check the form and try again.";

    toast.error(message);
  };

  return (
    <div className={cn("flex w-full flex-col items-center", className)} {...props}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
          className="flex w-full flex-col gap-3 sm:flex-row sm:items-baseline"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => {
              return (
                <FormItem className="w-full sm:flex-1 text-left">
                  <FormControl>
                    <Input
                      placeholder={placeholder}
                      className="h-12 rounded-lg bg-white/80 text-base shadow-xs backdrop-blur"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <Button
            type="submit"
            className="h-12 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={isButtonDisabled}
          >
            {form.formState.isSubmitting ? "Joining..." : buttonLabel}
          </Button>
        </form>
      </Form>
      {description && (
        <p className="mt-3 w-full text-center text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
