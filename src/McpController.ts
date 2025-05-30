import { Hono } from "hono";

import { container } from "./Container";
import { OpenRouterAskTool } from "./OpenRouterAskTool";
import PerplexityAskServer from "./Server";
import { StreamableHttpTransport } from "./StreamableHttpTransport";

const app = new Hono();

const routes = app.post("/", async (c) => {
  const transport = new StreamableHttpTransport({
    sessionIdGenerator: undefined,
  });

  const tool = new OpenRouterAskTool(container.config);
  const server = new PerplexityAskServer(container.config, tool);

  await server.connect(transport);

  return transport.handleRequest(c, await c.req.json());
});

export default routes;
