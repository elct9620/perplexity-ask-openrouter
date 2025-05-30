import { Server } from '@modelcontextprotocol/sdk/server/index'
import {
  ListToolsRequestSchema,
  ListToolsResult,
  CallToolRequestSchema ,
  CallToolResult,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types'

import { PERPLEXITY_ASK_TOOL, PERPLEXITY_REASON_TOOL, PERPLEXITY_RESEARCH_TOOL } from './ToolDefinition'
import { PerplexityAskTool } from './interface'

export default class PerplexityAskServer extends Server {
  constructor(
    private readonly askTool: PerplexityAskTool,
  ) {
    super(
      {
        name: 'Perplexity Ask OpenRouter',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    this.setRequestHandler(ListToolsRequestSchema, this.onListTools)
    this.setRequestHandler(CallToolRequestSchema, this.onCallTool)
  }

  onListTools = async (): Promise<ListToolsResult> => {
    return {
      tools: [PERPLEXITY_ASK_TOOL, PERPLEXITY_RESEARCH_TOOL, PERPLEXITY_REASON_TOOL],
    }
  }

  onCallTool = async (request: CallToolRequest): Promise<CallToolResult> => {
    try {
      const { name, arguments: args } = request.params
      if (!args) {
        throw new Error('No arguments provided.')
      }

      switch(name) {
        case 'perplexity_ask': {
          if(!Array.isArray(args.messages) || args.messages.length === 0) {
            throw new Error("Invalid arguments for perplexity_ask: `messages` must be an array.")
          }

          const text = await this.askTool.execute(args.messages, 'perplexity/sonar-pro')

          return {
            isError: false,
            content: [{ type: 'text', text }],
          }
        }
        case 'perplexity_research': {
          if(!Array.isArray(args.messages) || args.messages.length === 0) {
            throw new Error("Invalid arguments for perplexity_research: `messages` must be an array.")
          }
          const text = await this.askTool.execute(args.messages, 'perplexity/sonar-deep-research')

          return {
            isError: false,
            content: [{ type: 'text', text }],
          }
        }
        case 'perplexity_reason': {
          if(!Array.isArray(args.messages) || args.messages.length === 0) {
            throw new Error("Invalid arguments for perplexity_reason: `messages` must be an array.")
          }
          const text = await this.askTool.execute(args.messages, 'perplexity/sonar-reasoring-pro')

          return {
            isError: false,
            content: [{ type: 'text', text }],
          }
        }
        default:
          return {
            isError: true,
            content: [
              { type: 'text', text: `Unknown tool: ${name}` },
            ],
          }
      }
    } catch(error) {
      return {
        isError: true,
        content: [
          { type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ],
      }
    }
  }
}
