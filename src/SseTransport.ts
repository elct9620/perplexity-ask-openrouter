import crypto from 'node:crypto'

import { Transport } from '@modelcontextprotocol/sdk/shared/transport'
import { SSEStreamingApi } from 'hono/streaming'
import { JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types'
import { Context } from 'hono'

const MAXIMUM_MESSAGE_SIZE = 1024 * 1024 * 4 // 4MB

export class SseTransport implements Transport {
  private readonly _sessionId: string = crypto.randomUUID()
  private _isConnected: boolean = true

  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    private messageUrl: string,
    private stream: SSEStreamingApi,
  ) {
    this.stream.onAbort(() => {
      void this.close()
    })
  }

  get sessionId(): string {
    return this._sessionId
  }

  get isConnected(): boolean {
    return this._isConnected
  }

  async start(): Promise<void> {
    if(!this.stream) {
      throw new Error('Stream is not initialized')
    }

    if(this.stream.closed) {
      throw new Error('Stream is already closed')
    }

    await this.stream.writeSSE({
      event: 'ping',
      data: ''
    })

    await this.stream.writeSSE({
      event: 'endpoint',
      data: `${this.messageUrl}?sessionId=${this.sessionId}`
    })
  }

  async close(): Promise<void> {
    this._isConnected = false

    if(this.stream.closed) {
      return
    }

    await this.stream.abort()
    this.onclose?.()
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if(this.stream.closed) {
      throw new Error('Stream is closed')
    }

    await this.stream.writeSSE({
      event: 'message',
      data: JSON.stringify(message)
    })
  }

  async handlePostMessage(context: Context): Promise<Response> {
    if(this.stream.closed) {
      throw new Error('Stream is closed')
    }

    try {
      const contentType = context.req.header('Content-Type') || ''
      if (!contentType.includes('application/json')) {
        throw new Error(`Unsupported content type: ${contentType}`)
      }

      const contentLength = context.req.header('Content-Length')
      if (contentLength && Number.parseInt(contentLength, 10) > MAXIMUM_MESSAGE_SIZE) {
        throw new Error(`Message size exceeds maximum limit of ${MAXIMUM_MESSAGE_SIZE} bytes`)
      }

      const body = (await context.req.json()) as unknown
      await this.handleMessage(body)

      return context.text('Accepted', 202)
    } catch(error) {
      this.onerror?.(error as Error)

      return context.text(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 400)
    }
  }

  private async handleMessage(message: unknown): Promise<void> {
    let rpcMessage: JSONRPCMessage;

    try {
      rpcMessage = JSONRPCMessageSchema.parse(message);
    } catch (error) {
      throw new Error(`Invalid message format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.onmessage?.(rpcMessage);
  }
}
