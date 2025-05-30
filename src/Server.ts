import { Server } from '@modelcontextprotocol/sdk/server/index'
import {
  ListToolsRequestSchema,
  ListToolsResult,
  CallToolRequestSchema ,
  CallToolResult,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types'

import { PERPLEXITY_ASK_TOOL, PERPLEXITY_REASON_TOOL, PERPLEXITY_RESEARCH_TOOL } from './ToolDefinition'

export default class PerplexityAskServer extends Server {
  constructor() {
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
    return {
      isError: true,
      content: [
        { "type": "text", "text": "This tool is not implemented yet." },
      ]
    }
  }
}
