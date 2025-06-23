import { SseTransport } from "./SseTransport";

export class SseTransportRepository {
  private transports: Record<string, SseTransport> = {};

  public add(transport: SseTransport): void {
    this.transports[transport.sessionId] = transport;
  }

  public get(sessionId: string): SseTransport | undefined {
    return this.transports[sessionId];
  }

  public remove(sessionId: string): void {
    delete this.transports[sessionId];
  }

  public has(sessionId: string): boolean {
    return !!this.transports[sessionId];
  }

  public map<T>(callback: (transport: SseTransport) => T): T[] {
    return Object.values(this.transports).map(callback);
  }
}
