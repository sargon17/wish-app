import { z } from 'zod'

const envClientSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z.string().url().optional(),
  VITE_CONVEX_URL: z.string().url().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith('pk_', { message: 'Must start with pk_' })
    .optional(),
  VITE_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith('pk_', { message: 'Must start with pk_' })
    .optional(),
})

const raw = {
  NEXT_PUBLIC_CONVEX_URL:
    import.meta.env.VITE_NEXT_PUBLIC_CONVEX_URL ??
    import.meta.env.VITE_CONVEX_URL ??
    import.meta.env.NEXT_PUBLIC_CONVEX_URL ??
    undefined,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    import.meta.env.VITE_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ??
    import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    undefined,
}

const env = envClientSchema.parse(raw)

export default env
