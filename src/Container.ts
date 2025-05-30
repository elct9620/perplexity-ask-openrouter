import { Config, EnvConfig } from './Config';
import { OpenRouterAskTool } from './OpenRouterAskTool';
import PerplexityAskServer from './Server';
import { SseTransportRepository } from './SseTransportRepository'

export interface Container {
  config: Config
  sseMcpServer: PerplexityAskServer
  sseTransportRepository: SseTransportRepository
}

class InternalContainer implements Container {
  constructor(
    public readonly config: Config,
    public readonly sseMcpServer: PerplexityAskServer,
    public readonly sseTransportRepository: SseTransportRepository
  ) {}
}

const config = new EnvConfig()
const perplexityAskTool = new OpenRouterAskTool(config)

export const container: Container = new InternalContainer(
  config,
  new PerplexityAskServer(config, perplexityAskTool),
  new SseTransportRepository()
)
