import { Server } from '@modelcontextprotocol/sdk/server/index'
import {
  ListToolsRequestSchema,
  ListToolsResult,
  CallToolRequestSchema ,
  CallToolResult,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types'

import { PERPLEXITY_ASK_TOOL, PERPLEXITY_REASON_TOOL, PERPLEXITY_RESEARCH_TOOL } from './ToolDefinition'

export interface PerplexityTool {
  execute: (args: any) => Promise<string>
}

export default class PerplexityAskServer extends Server {
  constructor(
    private readonly askTool: PerplexityTool,
    private readonly researchTool: PerplexityTool,
    private readonly reasonTool: PerplexityTool
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
          const text = await this.askTool.execute(args)

          return {
            isError: false,
            content: [{ type: 'text', text }],
          }
        }
        case 'perplexity_research': {
          const text = await this.researchTool.execute(args)

          return {
            isError: false,
            content: [{ type: 'text', text }],
          }
        }
        case 'perplexity_reason': {
          const text = await this.reasonTool.execute(args)

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
