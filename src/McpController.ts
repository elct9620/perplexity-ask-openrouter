import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";

import { container } from "./Container";

const app = new Hono();

const routes = app.all("/", async (c) => {
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await container.mcpServer.connect(transport);

  return transport.handleRequest(c);
});

export default routes;
