# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

- `pnpm dev` - Start development mode with file watching
- `pnpm build` - Build for production

### Package Management

- Use **pnpm** (not npm/yarn) - this project uses pnpm v10.11.0

### Code Formatting

- `pnpm prettier --write .` - Format code (Prettier is configured)

### Environment Setup

Required environment variable:

- `OPENROUTER_API_KEY` - OpenRouter API key for accessing Perplexity models

Optional environment variables:

- `PORT` (default: 3000)
- `ASK_MODEL`, `RESEARCH_MODEL`, `REASON_MODEL` - Custom model configurations
- `DISABLE_ASK`, `DISABLE_RESEARCH`, `DISABLE_REASON` - Feature toggles

## Architecture Overview

This is a **Model Context Protocol (MCP) server** that provides access to Perplexity AI models through OpenRouter's API. The architecture follows these key patterns:

### Core Components

- `Server.ts` - Main MCP server implementation (`PerplexityAskServer`)
- `Container.ts` - Simple dependency injection container
- `Config.ts` - Environment-based configuration management
- `OpenRouterAskTool.ts` - OpenRouter API integration
- `ToolDefinition.ts` - Defines three MCP tools for different Perplexity models

### Transport Layer

The server supports dual transport architecture:

- **SSE (Server-Sent Events)** - Custom implementation for legacy compatibility
- **Streamable HTTP** - Official @hono/mcp transport for modern MCP clients
- Transport tracking through dedicated repository pattern

### Tool Architecture

Three distinct tools are provided:

1. **perplexity_ask** - General Q&A with `sonar-pro` model
2. **perplexity_research** - Deep research with `sonar-deep-research` model
3. **perplexity_reason** - Complex reasoning with `sonar-reasoning-pro` model

Each tool can be individually disabled via environment variables.

### Key Patterns

- **Repository Pattern** - Both `SseTransportRepository` and `McpTransportRepository` manage transport lifecycle
- **Dual Transport Strategy** - SSE for legacy, @hono/mcp for modern clients
- **Dependency Injection** - Simple container-based DI in `Container.ts`
- **Environment Configuration** - All config through environment variables

### Build System

- **Rolldown** (not Webpack/Vite) - Fast bundler optimized for Node.js
- **TypeScript** with strict type checking enabled
- **No testing framework** currently configured
- **No ESLint** - only Prettier for formatting

### Important Files

- `rolldown.config.mjs` - Build configuration
- `Dockerfile` - Multi-stage Docker build for production
- `.github/workflows/docker-build.yml` - CI/CD pipeline for container builds
- `SseController.ts` - SSE endpoint implementation (/sse)
- `McpController.ts` - MCP endpoint implementation (/mcp)
- `SseTransportRepository.ts` - SSE transport lifecycle management
- `McpTransportRepository.ts` - MCP transport lifecycle management

## Development Notes

### MCP Protocol Compliance

This server implements the MCP specification. When modifying tools or server behavior, ensure MCP compatibility is maintained.

### Error Handling

The application throws errors for missing required environment variables. When adding new features, follow the same pattern of failing fast with clear error messages.

### API Integration

OpenRouter API calls are centralized in `OpenRouterAskTool.ts`. All Perplexity model interactions should go through this component.

### Transport Management

The server implements dual transport management:

#### SSE Transport (/sse endpoint)

- Custom SSE implementation for legacy service compatibility
- Uses `SseTransportRepository` for session tracking via `transport.sessionId`
- Supports streaming communication for long-running connections

#### MCP Transport (/mcp endpoint)

- Official @hono/mcp StreamableHTTPTransport implementation
- Uses `McpTransportRepository` for transport tracking via generated `transportId`
- Configured with `enableJsonResponse: true` for modern MCP clients
- Stateless request/response pattern

#### Shutdown Handling

Both transport repositories use the same cleanup pattern:

```typescript
// Graceful shutdown closes all tracked transports
const closingTransports = repository.map((transport) => transport.close());
await Promise.all(closingTransports);
```

#### Transport Configuration

- **SSE**: Uses `transport.sessionId` directly from transport instance
- **MCP**: Uses `sessionIdGenerator: undefined` and external `transportId` tracking
