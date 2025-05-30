import { Transport } from '@modelcontextprotocol/sdk/shared/transport'
import { isJSONRPCError, isJSONRPCResponse, JSONRPCMessage, RequestId } from '@modelcontextprotocol/sdk/types';
import { SSEStreamingApi } from 'hono/streaming';

export class StreamableHttpTransport implements Transport {
  // NOTE: The StreamableHttpTransport is stateless only for now.
  private readonly _sessionId?: string = undefined;

  private _started: boolean = false;

  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    private readonly stream: SSEStreamingApi
  ) {}

  async start(): Promise<void> {
    if (this._started) {
      throw new Error('Transport already started');
    }

    this._started = true;
  }

  async close(): Promise<void> {
    if(this.stream.closed) {
      return;
    }

    this.stream.abort();
    this.onclose?.();
  }

  async send(message: JSONRPCMessage, options?: { relatedRequestId?: RequestId }): Promise<void> {
    let requestId = options?.relatedRequestId
    if(isJSONRPCResponse(message) || isJSONRPCError(message)) {
      requestId = message.id;
    }

    // TODO
  }
}
