import { Hono } from 'hono';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse'
import { toReqRes, toFetchResponse } from 'fetch-to-node'

import PerplexityAskServer from './Server'
import { OpenRouterAskTool } from './OpenRouterAskTool'
import { container } from './Container'

const app = new Hono();

const tool = new OpenRouterAskTool(container.config)
const server = new PerplexityAskServer(container.config, tool);
const transports: Record<string, SSEServerTransport> = {}

const routes = app.get('/sse', async (c) => {
  const { req, res } = toReqRes(c.req.raw)

  const transport = new SSEServerTransport('/messages', res)
  transports[transport.sessionId] = transport

  res.on("close", () => {
    console.log("Response closed for session:", transport.sessionId)
    delete transports[transport.sessionId]
  })

  await server.connect(transport)

  return toFetchResponse(res)
}).post('/messages', async (c) => {
  const { req, res } = toReqRes(c.req.raw)
  const sessionId = c.req.param('sessionId') || c.req.query('sessionId') || ''

  if (!transports[sessionId]) {
    return c.json({ error: 'Session not found' }, 404)
  }

  const transport = transports[sessionId]
  await transport.handlePostMessage(req, res, await c.req.json())

  return toFetchResponse(res)
})

export default routes
