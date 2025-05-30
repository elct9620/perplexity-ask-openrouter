import { Hono } from 'hono';
import { toReqRes, toFetchResponse } from 'fetch-to-node'

import PerplexityAskServer from './Server'
import { OpenRouterAskTool } from './OpenRouterAskTool'
import { container } from './Container'
import { SseTransport } from './SseTransport'
import { SseTransportRepository } from './SseTransportRepository'
import { streamSSE } from 'hono/streaming';

const app = new Hono();

const tool = new OpenRouterAskTool(container.config)

const routes = app.get('/sse', async (c) => {
  return streamSSE(c, async (stream) => {
    const transport = new SseTransport('/messages', stream)
    container.sseTransportRepository.add(transport)

    stream.onAbort(() => {
      console.log(`Stream aborted for session ${transport.sessionId}`)
      container.sseTransportRepository.remove(transport.sessionId)
    })

    await container.sseMcpServer.connect(transport)
    await transport.keepAlive()
  })
}).post('/messages', async (c) => {
  const sessionId = c.req.param('sessionId') || c.req.query('sessionId') || ''

  const transport = container.sseTransportRepository.get(sessionId)
  if (!transport) {
    return c.json({ error: 'Session not found' }, 404)
  }

  return await transport.handlePostMessage(c)
})

export default routes
