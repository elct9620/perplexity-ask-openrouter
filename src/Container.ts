import { Config, EnvConfig } from "./Config";
import { McpTransportRepository } from "./McpTransportRepository";
import { OpenRouterAskTool } from "./OpenRouterAskTool";
import PerplexityAskServer from "./Server";
import { SseTransportRepository } from "./SseTransportRepository";

export interface Container {
  config: Config;
  mcpServer: PerplexityAskServer;
  sseTransportRepository: SseTransportRepository;
  mcpTransportRepository: McpTransportRepository;
}

class InternalContainer implements Container {
  constructor(
    public readonly config: Config,
    public readonly mcpServer: PerplexityAskServer,
    public readonly sseTransportRepository: SseTransportRepository,
    public readonly mcpTransportRepository: McpTransportRepository,
  ) {}
}

const config = new EnvConfig();
const perplexityAskTool = new OpenRouterAskTool(config);

export const container: Container = new InternalContainer(
  config,
  new PerplexityAskServer(config, perplexityAskTool),
  new SseTransportRepository(),
  new McpTransportRepository(),
);
