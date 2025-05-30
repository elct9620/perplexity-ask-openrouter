# Perplexity Ask OpenRouter

A Model Context Protocol (MCP) server implementation that makes OpenRouter available for Perplexity Ask.

## Overview

This project is inspired by [Perplexity Ask](https://github.com/ppl-ai/modelcontextprotocol) and provides an MCP server implementation that connects to OpenRouter's API. It allows you to use Perplexity's models through OpenRouter with any MCP-compatible client.

## Features

- Full implementation of the Model Context Protocol
- Support for Perplexity's models via OpenRouter:
  - `perplexity_ask` - Uses Sonar model for general queries
  - `perplexity_research` - Uses Sonar Deep Research model for in-depth research
  - `perplexity_reason` - Uses Sonar Reasoning model for complex reasoning tasks
- Server-Sent Events (SSE) support
- Streamable HTTP transport implementation
- Docker containerization for easy deployment

## Getting Started

### Environment Variables

The server requires the following environment variables:

- `OPENROUTER_API_KEY` - Your OpenRouter API key (required)
- `PORT` - Port to run the server on (default: 3000)
- `BASE_URL` - Custom OpenRouter base URL (optional)
- `ASK_MODEL` - Model to use for ask tool (default: perplexity/sonar-pro)
- `RESEARCH_MODEL` - Model to use for research tool (default: perplexity/sonar-deep-research)
- `REASON_MODEL` - Model to use for reason tool (default: perplexity/sonar-reasoning-pro)
- `DISABLE_ASK` - Disable the ask tool (default: false)
- `DISABLE_RESEARCH` - Disable the research tool (default: false)
- `DISABLE_REASON` - Disable the reason tool (default: false)

### Running with Docker

The easiest way to run the server is using Docker:

```bash
docker run -p 3000:3000 \
  -e OPENROUTER_API_KEY=your_api_key_here \
  ghcr.io/elct9620/perplexity-ask-openrouter:latest
```

### Building from Source

If you prefer to build from source:

```bash
# Clone the repository
git clone https://github.com/elct9620/perplexity-ask-openrouter.git
cd perplexity-ask-openrouter

# Build Docker image
docker build -t perplexity-ask-openrouter .
```

## API Endpoints

The server exposes the following endpoints:

- `/sse` - SSE endpoint for establishing a connection
- `/messages` - Endpoint for sending messages to an established SSE connection
- `/mcp` - Streamable HTTP endpoint implementing the MCP protocol

## Usage with MCP Clients

This server implements the Model Context Protocol, so it can be used with any MCP-compatible client. The server supports both SSE and Streamable HTTP transport modes.

## Docker Deployment

The project includes a Dockerfile and GitHub Actions workflow for building and publishing the Docker image to GitHub Container Registry (ghcr.io).

## License

[MIT License](LICENSE)
