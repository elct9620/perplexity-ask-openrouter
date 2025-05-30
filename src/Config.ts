import process from 'node:process';

export interface Config {
  apiKey: string;
  baseUrl?: string;
  askModel: string;
  isDisableAsk: boolean;
  researchModel: string;
  isDisableResearch: boolean;
  reasonModel: string;
  isDisableReason: boolean;
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

  get isDisableAsk(): boolean {
    return process.env.DISABLE_ASK === 'true' || process.env.DISABLE_ASK === '1' || process.env.DISABLE_ASK === 'yes';
  }

  get researchModel(): string {
    return process.env.RESEARCH_MODEL || 'perplexity/sonar-deep-research';
  }

  get isDisableResearch(): boolean {
    return process.env.DISABLE_RESEARCH === 'true' || process.env.DISABLE_RESEARCH === '1' || process.env.DISABLE_RESEARCH === 'yes';
  }

  get reasonModel(): string {
    return process.env.REASON_MODEL || 'perplexity/sonar-reasoning-pro';
  }

  get isDisableReason(): boolean {
    return process.env.DISABLE_REASON === 'true' || process.env.DISABLE_REASON === '1' || process.env.DISABLE_REASON === 'yes';
  }
}
