import { Config, EnvConfig } from './Config';

export interface Container {
  config: Config
}

class InternalContainer implements Container {
  constructor(
    public readonly config: Config
  ) {}
}

export const container: Container = new InternalContainer(new EnvConfig())
