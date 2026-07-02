import { type } from 'arktype'

const envClientSchema = type({
  VITE_CONVEX_URL: 'string.url | undefined',
  VITE_CLERK_PUBLISHABLE_KEY: type(/^pk_/).describe('Must start with pk_').or('undefined'),
})

const raw = {
  VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL ?? undefined,
  VITE_CLERK_PUBLISHABLE_KEY:
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? undefined,
}

const env = envClientSchema.assert(raw)

export default env
