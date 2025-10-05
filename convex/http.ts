import type { HonoWithConvex } from 'convex-helpers/server/hono'
import type { Doc, Id } from './_generated/dataModel'
import type { ActionCtx } from './_generated/server'
import { arktypeValidator } from '@hono/arktype-validator'
import { type } from 'arktype'
import { HttpRouterWithHono } from 'convex-helpers/server/hono'
import { Hono } from 'hono'
import { api } from './_generated/api'

const app: HonoWithConvex<ActionCtx> = new Hono()

app.get('/api/project/:id/requests/', async (c) => {
  const id = c.req.param('id')

  const project = await c.env.runQuery(api.projects.getProjectById, { id })
  const requests = await c.env.runQuery(api.requests.getByProject, { id })
  const requestStatuses = await c.env.runQuery(api.requestStatuses.getByProject, { id })

  const mappedRequests = requests.map((request) => {
    const computedStatus = requestStatuses.find(status => status._id === request.status)!
    return { ...request, computedStatus }
  })

  return c.json({
    project,
    requests: mappedRequests,
  })
})

const RequestValidator = type({
  'text': 'string > 3',
  'description?': 'string | undefined',
  'project': 'string',
  'clientId': 'string',
})

app.post('/api/project/:id/request/', arktypeValidator('json', RequestValidator), async (c) => {
  const id = c.req.param('id')
  const body = await c.req.valid('json')

  try {
    const project = await c.env.runQuery(api.projects.getProjectById, { id })
    const status = (await c.env.runQuery(api.requestStatuses.getByProject, { id })).find(v => v.name === 'open')

    if (!project || !status)
      throw new Error('invalid project or status')

    await c.env.runMutation(api.requests.create, { ...body, project: project._id, status: status._id })
  }
  catch {
    return c.json({}, 400)
  }

  return c.json({}, 200)
})

app.get('/api/project/:id/request/delete/:reqID', async (c) => {
  const reqId = c.req.param('reqID')

  try {
    if (!reqId)
      throw new Error('invalid request id')

    await c.env.runMutation(api.requests.deleteRequest, { id: reqId as Id<'requests'> })
  }
  catch {
    return c.json({}, 400)
  }

  return c.json({}, 200)
})

export default new HttpRouterWithHono(app)
