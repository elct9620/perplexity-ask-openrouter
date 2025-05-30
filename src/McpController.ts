import { Hono } from 'hono';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp'
import { toReqRes, toFetchResponse } from 'fetch-to-node'

import PerplexityAskServer from './Server'

const app = new Hono();

const routes = app.post('/', async (c) => {
  const { req, res } = toReqRes(c.req.raw)

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  })

  const server = new PerplexityAskServer();

  await server.connect(transport)
  await transport.handleRequest(req, res, await c.req.json())

  res.on("close", () => {
    console.log("Response closed")
    transport.close()
    server.close()
  })

  return toFetchResponse(res)
})

export default routes
