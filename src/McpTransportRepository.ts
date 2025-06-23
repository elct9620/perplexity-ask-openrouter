import { StreamableHTTPTransport } from "@hono/mcp";

export class McpTransportRepository {
  private transports: Record<string, StreamableHTTPTransport> = {};

  public add(transport: StreamableHTTPTransport, transportId: string): void {
    this.transports[transportId] = transport;
  }

  public get(transportId: string): StreamableHTTPTransport | undefined {
    return this.transports[transportId];
  }

  public remove(transportId: string): void {
    delete this.transports[transportId];
  }

  public has(transportId: string): boolean {
    return !!this.transports[transportId];
  }

  public map<T>(callback: (transport: StreamableHTTPTransport) => T): T[] {
    return Object.values(this.transports).map(callback);
  }
}
