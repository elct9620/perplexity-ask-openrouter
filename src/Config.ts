import process from 'node:process';

export interface Config {
  apiKey: string;
  baseUrl?: string;
  askModel: string;
  researchModel: string;
  reasonModel: string;
}

export class EnvConfig implements Config {
  constructor() {
  }

  get apiKey(): string {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }
    return key;
  }

  get baseUrl(): string | undefined {
    return process.env.BASE_URL;
  }

  get askModel(): string {
    return process.env.ASK_MODEL || 'perplexity/sonar-pro';
  }

  get researchModel(): string {
    return process.env.RESEARCH_MODEL || 'perplexity/sonar-deep-research';
  }

  get reasonModel(): string {
    return process.env.REASON_MODEL || 'perplexity/sonar-reasoning-pro';
  }
}
