import { Hono } from 'hono';
import { toReqRes, toFetchResponse } from 'fetch-to-node'

import PerplexityAskServer from './Server'
import { OpenRouterAskTool } from './OpenRouterAskTool'
import { container } from './Container'
import { SseTransport } from './SseTransport'
import { streamSSE } from 'hono/streaming';

const app = new Hono();

const tool = new OpenRouterAskTool(container.config)
const server = new PerplexityAskServer(container.config, tool);
const transports: Record<string, SseTransport> = {}

const routes = app.get('/sse', async (c) => {
  return streamSSE(c, async (stream) => {
    const transport = new SseTransport('/messages', stream)
    transports[transport.sessionId] = transport

    stream.onAbort(() => {
      console.log(`Stream aborted for session ${transport.sessionId}`)
      delete transports[transport.sessionId]
    })

    await server.connect(transport)

    while(true) {
      await stream.sleep(60000) // Keep the connection alive
    }
  })
}).post('/messages', async (c) => {
  const sessionId = c.req.param('sessionId') || c.req.query('sessionId') || ''

  const transport = transports[sessionId]
  if (!transport) {
    return c.json({ error: 'Session not found' }, 404)
  }

  return await transport.handlePostMessage(c)
})

export default routes
