/* eslint-disable node/prefer-global/process */
import { z } from 'zod'

const envServerSchema = z.object({
  CONVEX_DEPLOYMENT: z.string(),
  CLERK_JWT_ISSUER_DOMAIN: z.string().url(),
  CLERK_SECRET_KEY: z
    .string()
    .startsWith('sk_', { message: 'Must start with sk_' }),
})

const raw = {
  CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
  CLERK_JWT_ISSUER_DOMAIN: process.env.CLERK_JWT_ISSUER_DOMAIN,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
}

const envServer = envServerSchema.parse(raw)

export default envServer
