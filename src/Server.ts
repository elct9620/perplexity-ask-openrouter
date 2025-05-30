import { Server } from "@modelcontextprotocol/sdk/server/index";
import {
  CallToolRequest,
  CallToolRequestSchema,
  CallToolResult,
  ListToolsRequestSchema,
  ListToolsResult,
} from "@modelcontextprotocol/sdk/types";

import { Config } from "./Config";
import {
  PERPLEXITY_ASK_TOOL,
  PERPLEXITY_REASON_TOOL,
  PERPLEXITY_RESEARCH_TOOL,
} from "./ToolDefinition";
import { PerplexityAskTool } from "./interface";

export default class PerplexityAskServer extends Server {
  constructor(
    private readonly config: Config,
    private readonly askTool: PerplexityAskTool,
  ) {
    super(
      {
        name: "Perplexity Ask OpenRouter",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setRequestHandler(ListToolsRequestSchema, this.onListTools);
    this.setRequestHandler(CallToolRequestSchema, this.onCallTool);
  }

  onListTools = async (): Promise<ListToolsResult> => {
    let tools = [];
    if (!this.config.isDisableAsk) {
      tools.push(PERPLEXITY_ASK_TOOL);
    }

    if (!this.config.isDisableResearch) {
      tools.push(PERPLEXITY_RESEARCH_TOOL);
    }

    if (!this.config.isDisableReason) {
      tools.push(PERPLEXITY_REASON_TOOL);
    }

    return { tools };
  };

  onCallTool = async (request: CallToolRequest): Promise<CallToolResult> => {
    try {
      const { name, arguments: args } = request.params;
      if (!args) {
        throw new Error("No arguments provided.");
      }

      switch (name) {
        case "perplexity_ask": {
          if (this.config.isDisableAsk) {
            return {
              isError: true,
              content: [
                { type: "text", text: "Perplexity Ask tool is disabled." },
              ],
            };
          }

          if (!Array.isArray(args.messages) || args.messages.length === 0) {
            throw new Error(
              "Invalid arguments for perplexity_ask: `messages` must be an array.",
            );
          }

          const text = await this.askTool.execute(
            args.messages,
            this.config.askModel,
          );

          return {
            isError: false,
            content: [{ type: "text", text }],
          };
        }
        case "perplexity_research": {
          if (this.config.isDisableResearch) {
            return {
              isError: true,
              content: [
                { type: "text", text: "Perplexity Research tool is disabled." },
              ],
            };
          }

          if (!Array.isArray(args.messages) || args.messages.length === 0) {
            throw new Error(
              "Invalid arguments for perplexity_research: `messages` must be an array.",
            );
          }
          const text = await this.askTool.execute(
            args.messages,
            this.config.researchModel,
          );

          return {
            isError: false,
            content: [{ type: "text", text }],
          };
        }
        case "perplexity_reason": {
          if (this.config.isDisableReason) {
            return {
              isError: true,
              content: [
                { type: "text", text: "Perplexity Reason tool is disabled." },
              ],
            };
          }

          if (!Array.isArray(args.messages) || args.messages.length === 0) {
            throw new Error(
              "Invalid arguments for perplexity_reason: `messages` must be an array.",
            );
          }
          const text = await this.askTool.execute(
            args.messages,
            this.config.reasonModel,
          );

          return {
            isError: false,
            content: [{ type: "text", text }],
          };
        }
        default:
          return {
            isError: true,
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
          };
      }
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  };
}
