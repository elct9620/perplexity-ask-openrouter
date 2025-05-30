export interface PerplexityAskTool {
  execute: (messages: any, model?: string) => Promise<string>;
}
