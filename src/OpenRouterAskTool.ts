import { Config } from "./Config";
import { PerplexityAskTool } from "./interface";

export class OpenRouterAskTool implements PerplexityAskTool {
  constructor(private readonly config: Config) {}

  get baseUrl(): string {
    return this.config.baseUrl || "https://openrouter.ai/api/v1";
  }

  private get apiKey(): string {
    const key = this.config.apiKey;

    if (!key) {
      throw new Error("API key is not set in the configuration");
    }

    return key;
  }

  async execute(
    messages: Array<{ role: string; content: string }>,
    model: string = "perplexity/sonar",
  ): Promise<string> {
    let response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Title": "Perplexity Ask OpenRouter",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      });
    } catch (error) {
      throw new Error(`Network error while calling OpenRouter API: ${error}`);
    }

    if (!response.ok) {
      let errorMessage;
      try {
        errorMessage = await response.text();
      } catch (e) {
        errorMessage =
          "Unknown error occurred while processing the error response.";
      }

      throw new Error(
        `OpenRouter API error: ${response.status} - ${errorMessage}`,
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error(
        `Failed to parse JSON response from OpenRouter API: ${error}`,
      );
    }

    let content = data.choices?.[0]?.message?.content;
    if (
      data.citations &&
      Array.isArray(data.citations) &&
      data.citations.length > 0
    ) {
      content += "\n\nCitations:\n";
      data.citations.forEach((citation: string, index: number) => {
        content += `[${index + 1}] ${citation}\n`;
      });
    }

    return content;
  }
}
