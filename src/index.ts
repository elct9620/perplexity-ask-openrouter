import process from "node:process";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { container } from "./Container";
import McpController from "./McpController";
import SseController from "./SseController";

const port = Number(process.env.PORT || 3000);

const app = new Hono();
app.route("/", SseController);
app.route("/mcp", McpController);

console.log(`Starting server on port ${port}...`);
const server = serve({
  fetch: app.fetch,
  port,
});

const onShutdown = () => {
  container.sseTransportRepository.forEach((transport) => {
    transport.close();
  });
  container.sseMcpServer.close();

  console.log("Shutting down server...");
  server.close((err: any) => {
    if (err) {
      console.error("Error during shutdown:", err);
    } else {
      console.log("Server shut down successfully.");
      process.exit(0);
    }
  });
};

process.on("SIGINT", onShutdown);
process.on("SIGTERM", onShutdown);
