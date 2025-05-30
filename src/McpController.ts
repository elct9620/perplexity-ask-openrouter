import { Hono } from 'hono';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp'
import { toReqRes, toFetchResponse } from 'fetch-to-node'

import PerplexityAskServer from './Server'
import { OpenRouterAskTool } from './AskTool'
import { OpenRouterResearchTool } from './ResearchTool'
import { OpenRouterReasonTool } from './ReasonTool'

const askTool = new OpenRouterAskTool();
const researchTool = new OpenRouterResearchTool();
const reasonTool = new OpenRouterReasonTool();

const app = new Hono();

const routes = app.post('/', async (c) => {
  const { req, res } = toReqRes(c.req.raw)

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  })

  const server = new PerplexityAskServer(
    askTool,
    researchTool,
    reasonTool
  );

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
