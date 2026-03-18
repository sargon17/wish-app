import { z } from 'zod'

const envClientSchema = z.object({
  VITE_CONVEX_URL: z.string().url().optional(),
  VITE_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith('pk_', { message: 'Must start with pk_' })
    .optional(),
})

const raw = {
  VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL ?? undefined,
  VITE_CLERK_PUBLISHABLE_KEY:
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? undefined,
}

const env = envClientSchema.parse(raw)

export default env
