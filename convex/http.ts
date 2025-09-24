import type { HonoWithConvex } from 'convex-helpers/server/hono'
import type { ActionCtx } from './_generated/server'
import { HttpRouterWithHono } from 'convex-helpers/server/hono'
import { Hono } from 'hono'
import { api } from './_generated/api'

const app: HonoWithConvex<ActionCtx> = new Hono()

// Add your routes to `app`. See below

app.get('/api/project/:id/requests/', async (c) => {
  const id = c.req.param('id')

  const project = await c.env.runQuery(api.projects.getProjectById, { id })
  const requests = await c.env.runQuery(api.requests.getByProject, { id })

  return c.json({
    ok: true,
    message: 'Hello Hono!',
    project,
    requests,
  })
})

// jd7crj6f0q5we4x7kc7808t5bh7pneyp

export default new HttpRouterWithHono(app)
