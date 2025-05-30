import process from 'node:process'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { toReqRes, toFetchResponse } from 'fetch-to-node'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp'

const port = Number(process.env.PORT || 3000);
const app = new Hono()

app.post('/mcp', async (c) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  })

  const { req, res } = toReqRes(c.req.raw)

  const server = new McpServer({
    name: 'Perplexity Ask OpenRouter',
    version: '0.1.0',
  });

  await server.connect(transport)
  await transport.handleRequest(req, res, await c.req.json())

  res.on("close", () => {
    console.log("Response closed")
    transport.close()
    server.close()
  })

  return toFetchResponse(res)
})

console.log(`Starting server on port ${port}...`)
const server = serve({
  fetch: app.fetch,
  port,
})

const onShutdown = () => {
  console.log('Shutting down server...')
  server.close((err: any) => {
    if (err) {
      console.error('Error during shutdown:', err)
    } else {
      console.log('Server shut down successfully.')
      process.exit(0)
    }
  })
}

process.on('SIGINT', onShutdown)
process.on('SIGTERM', onShutdown)
