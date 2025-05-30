import { Config, EnvConfig } from './Config';
import { SseTransportRepository } from './SseTransportRepository'

export interface Container {
  config: Config
  sseTransportRepository: SseTransportRepository
}

class InternalContainer implements Container {
  constructor(
    public readonly config: Config,
    public readonly sseTransportRepository: SseTransportRepository
  ) {}
}

export const container: Container = new InternalContainer(
  new EnvConfig(),
  new SseTransportRepository()
)
