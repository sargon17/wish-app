/* eslint-disable node/prefer-global/process */
import { z } from 'zod'

const envClientSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_FRONTEND_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .startsWith('pk_', { message: 'Must start with pk_' }),
})

const raw = {
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_CLERK_FRONTEND_API_URL:
    process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
}

const env = envClientSchema.parse(raw)

export default env
