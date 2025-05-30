import { PerplexityTool } from "./Server"

export class OpenRouterResearchTool implements PerplexityTool {
  async execute(args: { messages: Array<{ role: string, content: string }>}): Promise<string> {
    if(!Array.isArray(args.messages) || args.messages.length === 0) {
      throw new Error("Invalid arguments for perplexity_research: `messages` must be an array.")
    }

    return "This is a placeholder response from the OpenRouter Research Tool. "
  }
}
