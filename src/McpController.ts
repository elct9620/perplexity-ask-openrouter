import { Hono } from 'hono';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp'
import { toReqRes, toFetchResponse } from 'fetch-to-node'

import PerplexityAskServer from './Server'
import { OpenRouterAskTool } from './OpenRouterAskTool'
import { container } from './Container'
import { StreamableHttpTransport } from './StreamableHttpTransport'

const app = new Hono();

const routes = app.post('/', async (c) => {
  const transport = new StreamableHttpTransport({
    sessionIdGenerator: undefined,
  })

  const tool = new OpenRouterAskTool(container.config)
  const server = new PerplexityAskServer(container.config, tool);

  await server.connect(transport)

  return transport.handleRequest(c, await c.req.json())
})

export default routes
