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

The server supports multiple transport methods:

- **SSE (Server-Sent Events)** - Primary transport for real-time communication
- **HTTP Streaming** - Alternative streaming transport
- Session management through `SseTransportRepository.ts`

### Tool Architecture

Three distinct tools are provided:

1. **perplexity_ask** - General Q&A with `sonar-pro` model
2. **perplexity_research** - Deep research with `sonar-deep-research` model
3. **perplexity_reason** - Complex reasoning with `sonar-reasoning-pro` model

Each tool can be individually disabled via environment variables.

### Key Patterns

- **Repository Pattern** - `SseTransportRepository` manages transport sessions
- **Strategy Pattern** - Multiple transport strategies (SSE/HTTP)
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

## Development Notes

### MCP Protocol Compliance

This server implements the MCP specification. When modifying tools or server behavior, ensure MCP compatibility is maintained.

### Error Handling

The application throws errors for missing required environment variables. When adding new features, follow the same pattern of failing fast with clear error messages.

### API Integration

OpenRouter API calls are centralized in `OpenRouterAskTool.ts`. All Perplexity model interactions should go through this component.

### Transport Management

When working with real-time features, use the SSE transport system. The `SseTransportRepository` handles session lifecycle management.
