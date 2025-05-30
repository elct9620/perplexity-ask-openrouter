import { Transport } from "@modelcontextprotocol/sdk/shared/transport";
import {
  isInitializeRequest,
  isJSONRPCError,
  isJSONRPCRequest,
  isJSONRPCResponse,
  JSONRPCMessage,
  JSONRPCMessageSchema,
  RequestId,
} from "@modelcontextprotocol/sdk/types";
import { randomUUID } from "crypto";
import { Context } from "hono";
import { SSEStreamingApi, streamSSE } from "hono/streaming";

export type StreamId = string;
export type EventId = string;

/**
 * Interface for resumability support via event storage
 */
export interface EventStore {
  /**
   * Stores an event for later retrieval
   * @param streamId ID of the stream the event belongs to
   * @param message The JSON-RPC message to store
   * @returns The generated event ID for the stored event
   */
  storeEvent(streamId: StreamId, message: JSONRPCMessage): Promise<EventId>;

  replayEventsAfter(
    lastEventId: EventId,
    {
      send,
    }: {
      send: (eventId: EventId, message: JSONRPCMessage) => Promise<void>;
    },
  ): Promise<StreamId>;
}

/**
 * Configuration options for StreamableHttpTransport
 */
export interface StreamableHttpTransportOptions {
  /**
   * Function that generates a session ID for the transport.
   * The session ID SHOULD be globally unique and cryptographically secure (e.g., a securely generated UUID, a JWT, or a cryptographic hash)
   *
   * Return undefined to disable session management.
   */
  sessionIdGenerator?: (() => string) | undefined;

  /**
   * A callback for session initialization events
   * This is called when the server initializes a new session.
   * Useful in cases when you need to register multiple mcp sessions
   * and need to keep track of them.
   * @param sessionId The generated session ID
   */
  onsessioninitialized?: (sessionId: string) => void;

  /**
   * If true, the server will return JSON responses instead of starting an SSE stream.
   * This can be useful for simple request/response scenarios without streaming.
   * Default is false (SSE streams are preferred).
   */
  enableJsonResponse?: boolean;

  /**
   * Event store for resumability support
   * If provided, resumability will be enabled, allowing clients to reconnect and resume messages
   */
  eventStore?: EventStore;
}

const MAXIMUM_MESSAGE_SIZE = 1024 * 1024 * 4; // 4MB

export class StreamableHttpTransport implements Transport {
  private readonly sessionIdGenerator: (() => string) | undefined;
  private readonly _sessionId?: string;
  private _started: boolean = false;
  private _streamMapping: Map<string, SSEStreamingApi> = new Map();
  private _requestToStreamMapping: Map<RequestId, string> = new Map();
  private _requestResponseMap: Map<RequestId, JSONRPCMessage> = new Map();
  private _initialized: boolean = false;
  private _enableJsonResponse: boolean = false;
  private _standaloneSseStreamId: string = "_GET_stream";
  private _eventStore?: EventStore;
  private _onsessioninitialized?: (sessionId: string) => void;

  public onclose?: () => void;
  public onerror?: (error: Error) => void;
  public onmessage?: (
    message: JSONRPCMessage,
    extra?: { authInfo?: any },
  ) => void;

  constructor(options: StreamableHttpTransportOptions = {}) {
    this.sessionIdGenerator = options.sessionIdGenerator;
    this._sessionId = this.sessionIdGenerator?.();
    this._enableJsonResponse = options.enableJsonResponse ?? false;
    this._eventStore = options.eventStore;
    this._onsessioninitialized = options.onsessioninitialized;
  }

  get sessionId(): string | undefined {
    return this._sessionId;
  }

  async start(): Promise<void> {
    if (this._started) {
      throw new Error("Transport already started");
    }
    this._started = true;
  }

  async close(): Promise<void> {
    // Close all SSE connections
    this._streamMapping.forEach((stream) => {
      if (!stream.closed) {
        stream.abort();
      }
    });
    this._streamMapping.clear();

    // Clear any pending responses
    this._requestResponseMap.clear();
    this._requestToStreamMapping.clear();

    this.onclose?.();
  }

  /**
   * Handles an incoming HTTP request
   */
  async handleRequest(
    context: Context,
    parsedBody?: unknown,
  ): Promise<Response> {
    const method = context.req.method;

    if (method === "POST") {
      return this.handlePostRequest(context, parsedBody);
    } else if (method === "GET") {
      return this.handleGetRequest(context);
    } else if (method === "DELETE") {
      return this.handleDeleteRequest(context);
    } else {
      return this.handleUnsupportedRequest(context);
    }
  }

  /**
   * Handles GET requests for SSE stream
   */
  private async handleGetRequest(context: Context): Promise<Response> {
    // The client MUST include an Accept header, listing text/event-stream as a supported content type.
    const acceptHeader = context.req.header("Accept");
    if (!acceptHeader?.includes("text/event-stream")) {
      return context.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Not Acceptable: Client must accept text/event-stream",
          },
          id: null,
        },
        406,
      );
    }

    // If an Mcp-Session-Id is returned by the server during initialization,
    // clients using the Streamable HTTP transport MUST include it
    // in the Mcp-Session-Id header on all of their subsequent HTTP requests.
    if (!this.validateSession(context)) {
      return context.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Session not found or invalid",
          },
          id: null,
        },
        404,
      );
    }

    // Handle resumability: check for Last-Event-ID header
    if (this._eventStore) {
      const lastEventId = context.req.header("Last-Event-ID");
      if (lastEventId) {
        return this.replayEvents(context, lastEventId);
      }
    }

    // Check if there's already an active standalone SSE stream for this session
    if (this._streamMapping.get(this._standaloneSseStreamId) !== undefined) {
      // Only one GET SSE stream is allowed per session
      return context.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Conflict: Only one SSE stream is allowed per session",
          },
          id: null,
        },
        409,
      );
    }

    // Create a new SSE stream
    return streamSSE(context, async (stream) => {
      // After initialization, always include the session ID if we have one
      if (this._sessionId !== undefined) {
        context.header("mcp-session-id", this._sessionId);
      }

      // Assign the stream to the standalone SSE stream
      this._streamMapping.set(this._standaloneSseStreamId, stream);

      // Set up close handler for client disconnects
      stream.onAbort(() => {
        console.log(
          `Standalone SSE stream closed for session ID: ${this._sessionId}`,
        );
        this._streamMapping.delete(this._standaloneSseStreamId);
      });

      while (!stream.closed) {
        await stream.sleep(60000);
      }
    });
  }

  /**
   * Replays events that would have been sent after the specified event ID
   * Only used when resumability is enabled
   */
  private async replayEvents(
    context: Context,
    lastEventId: string,
  ): Promise<Response> {
    if (!this._eventStore) {
      return context.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Resumability not supported",
          },
          id: null,
        },
        400,
      );
    }

    return streamSSE(context, async (stream) => {
      if (this.sessionId !== undefined) {
        context.header("mcp-session-id", this._sessionId);
      }

      try {
        const streamId = await this._eventStore?.replayEventsAfter(
          lastEventId,
          {
            send: async (eventId: string, message: JSONRPCMessage) => {
              if (!(await this.writeSSEEvent(stream, message, eventId))) {
                this.onerror?.(new Error("Failed to replay events"));
                stream.close();
              }
            },
          },
        );

        if (!streamId) {
          return;
        }

        this._streamMapping.set(streamId, stream);
      } catch (error) {
        this.onerror?.(error as Error);
      }
    });
  }

  /**
   * Writes an event to the SSE stream with proper formatting
   */
  private async writeSSEEvent(
    stream: SSEStreamingApi,
    message: JSONRPCMessage,
    eventId?: string,
  ): Promise<boolean> {
    try {
      await stream.writeSSE({
        id: eventId,
        event: "message",
        data: JSON.stringify(message),
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handles unsupported requests (PUT, PATCH, etc.)
   */
  private async handleUnsupportedRequest(context: Context): Promise<Response> {
    return context.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      },
      405,
      {
        Allow: "GET, POST, DELETE",
      },
    );
  }

  /**
   * Handles POST requests containing JSON-RPC messages
   */
  private async handlePostRequest(
    context: Context,
    parsedBody?: unknown,
  ): Promise<Response> {
    try {
      // Validate the Accept header
      const acceptHeader = context.req.header("Accept");
      // The client MUST include an Accept header, listing both application/json and text/event-stream as supported content types.
      if (
        !acceptHeader?.includes("application/json") ||
        !acceptHeader?.includes("text/event-stream")
      ) {
        return context.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message:
                "Not Acceptable: Client must accept both application/json and text/event-stream",
            },
            id: null,
          },
          406,
        );
      }

      const contentType = context.req.header("Content-Type");
      if (!contentType || !contentType.includes("application/json")) {
        return context.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32000,
              message:
                "Unsupported Media Type: Content-Type must be application/json",
            },
            id: null,
          },
          415,
        );
      }

      const authInfo = context.get("auth") as any | undefined;

      let rawMessage;
      if (parsedBody !== undefined) {
        rawMessage = parsedBody;
      } else {
        // Check content length
        const contentLength = context.req.header("Content-Length");
        if (
          contentLength &&
          Number.parseInt(contentLength, 10) > MAXIMUM_MESSAGE_SIZE
        ) {
          return context.json(
            {
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message: `Message size exceeds maximum limit of ${MAXIMUM_MESSAGE_SIZE} bytes`,
              },
              id: null,
            },
            413,
          );
        }

        rawMessage = await context.req.json();
      }

      let messages: JSONRPCMessage[];

      // handle batch and single messages
      if (Array.isArray(rawMessage)) {
        messages = rawMessage.map((msg) => JSONRPCMessageSchema.parse(msg));
      } else {
        messages = [JSONRPCMessageSchema.parse(rawMessage)];
      }

      // Check if this is an initialization request
      const isInitializationRequest = messages.some(isInitializeRequest);
      if (isInitializationRequest) {
        // If it's a server with session management and the session ID is already set we should reject the request
        // to avoid re-initialization.
        if (this._initialized && this._sessionId !== undefined) {
          return context.json(
            {
              jsonrpc: "2.0",
              error: {
                code: -32600,
                message: "Invalid Request: Server already initialized",
              },
              id: null,
            },
            400,
          );
        }
        if (messages.length > 1) {
          return context.json(
            {
              jsonrpc: "2.0",
              error: {
                code: -32600,
                message:
                  "Invalid Request: Only one initialization request is allowed",
              },
              id: null,
            },
            400,
          );
        }
        this._initialized = true;

        // If we have a session ID and an onsessioninitialized handler, call it immediately
        if (this._sessionId && this._onsessioninitialized) {
          this._onsessioninitialized(this._sessionId);
        }
      }

      // If an Mcp-Session-Id is returned by the server during initialization,
      // clients using the Streamable HTTP transport MUST include it
      // in the Mcp-Session-Id header on all of their subsequent HTTP requests.
      if (!isInitializationRequest && !this.validateSession(context)) {
        return context.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32001,
              message: "Session not found or invalid",
            },
            id: null,
          },
          404,
        );
      }

      // check if it contains requests
      const hasRequests = messages.some(isJSONRPCRequest);

      if (!hasRequests) {
        // if it only contains notifications or responses, return 202
        // handle each message
        for (const message of messages) {
          this.onmessage?.(message, { authInfo });
        }

        return context.text("", 202);
      } else {
        // The default behavior is to use SSE streaming
        // but in some cases server will return JSON responses
        const streamId = randomUUID();

        if (!this._enableJsonResponse) {
          // Create a new SSE stream for this request
          return streamSSE(context, async (stream) => {
            if (this._sessionId !== undefined) {
              context.header("mcp-session-id", this._sessionId);
            }

            // Store the stream for this request to send messages back through this connection
            // We need to track by request ID to maintain the connection
            for (const message of messages) {
              if (isJSONRPCRequest(message)) {
                this._streamMapping.set(streamId, stream);
                this._requestToStreamMapping.set(message.id, streamId);
              }
            }

            // Set up close handler for client disconnects
            stream.onAbort(() => {
              console.log(`Stream closed for stream ID: ${streamId}`);
              this._streamMapping.delete(streamId);
            });

            // handle each message
            for (const message of messages) {
              this.onmessage?.(message, { authInfo });
            }

            while (!stream.closed) {
              await stream.sleep(60000); // Sleep for 60 seconds
            }
          });
        } else {
          // For JSON responses, we'll collect all responses and send them at once
          // Store the request IDs for tracking
          for (const message of messages) {
            if (isJSONRPCRequest(message)) {
              this._requestToStreamMapping.set(message.id, streamId);
            }
          }

          // handle each message
          for (const message of messages) {
            this.onmessage?.(message, { authInfo });
          }

          // For JSON responses, we need to wait for all responses to be ready
          // This will be handled by a Promise that resolves when all responses are ready
          return new Promise<Response>((resolve) => {
            const checkResponses = () => {
              const relatedIds = Array.from(
                this._requestToStreamMapping.entries(),
              )
                .filter(([_, sid]) => sid === streamId)
                .map(([id]) => id);

              // Check if we have responses for all requests
              const allResponsesReady = relatedIds.every((id) =>
                this._requestResponseMap.has(id),
              );

              if (allResponsesReady) {
                const responses = relatedIds.map(
                  (id) => this._requestResponseMap.get(id)!,
                );

                const headers: Record<string, string> = {
                  "Content-Type": "application/json",
                };

                if (this._sessionId !== undefined) {
                  headers["mcp-session-id"] = this._sessionId;
                }

                // Clean up
                for (const id of relatedIds) {
                  this._requestResponseMap.delete(id);
                  this._requestToStreamMapping.delete(id);
                }

                if (responses.length === 1) {
                  resolve(context.json(responses[0], 200, headers));
                } else {
                  resolve(context.json(responses, 200, headers));
                }
              } else {
                // Check again in a short while
                setTimeout(checkResponses, 50);
              }
            };

            // Start checking for responses
            checkResponses();
          });
        }
      }
    } catch (error) {
      this.onerror?.(error as Error);

      // return JSON-RPC formatted error
      return context.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: "Parse error",
            data: String(error),
          },
          id: null,
        },
        400,
      );
    }
  }

  /**
   * Handles DELETE requests to terminate sessions
   */
  private async handleDeleteRequest(context: Context): Promise<Response> {
    if (!this.validateSession(context)) {
      return context.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Session not found or invalid",
          },
          id: null,
        },
        404,
      );
    }

    await this.close();
    return context.text("", 200);
  }

  /**
   * Validates session ID for non-initialization requests
   * Returns true if the session is valid, false otherwise
   */
  private validateSession(context: Context): boolean {
    if (this.sessionIdGenerator === undefined) {
      // If the sessionIdGenerator is not set, the session management is disabled
      // and we don't need to validate the session ID
      return true;
    }

    if (!this._initialized) {
      // If the server has not been initialized yet, reject all requests
      return false;
    }

    const sessionId = context.req.header("mcp-session-id");

    if (!sessionId) {
      // Non-initialization requests without a session ID should return 400 Bad Request
      return false;
    } else if (sessionId !== this._sessionId) {
      // Reject requests with invalid session ID with 404 Not Found
      return false;
    }

    return true;
  }

  async send(
    message: JSONRPCMessage,
    options?: { relatedRequestId?: RequestId },
  ): Promise<void> {
    let requestId = options?.relatedRequestId;
    if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
      // If the message is a response, use the request ID from the message
      requestId = message.id;
    }

    // Check if this message should be sent on the standalone SSE stream (no request ID)
    if (requestId === undefined) {
      // For standalone SSE streams, we can only send requests and notifications
      if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
        throw new Error(
          "Cannot send a response on a standalone SSE stream unless resuming a previous client request",
        );
      }

      const standaloneSse = this._streamMapping.get(
        this._standaloneSseStreamId,
      );
      if (standaloneSse === undefined) {
        // The spec says the server MAY send messages on the stream, so it's ok to discard if no stream
        return;
      }

      // Generate and store event ID if event store is provided
      let eventId: string | undefined;
      if (this._eventStore) {
        // Stores the event and gets the generated event ID
        eventId = await this._eventStore.storeEvent(
          this._standaloneSseStreamId,
          message,
        );
      }

      // Send the message to the standalone SSE stream
      await this.writeSSEEvent(standaloneSse, message, eventId);
      return;
    }

    // Get the stream for this request
    const streamId = this._requestToStreamMapping.get(requestId);
    if (!streamId) {
      throw new Error(
        `No connection established for request ID: ${String(requestId)}`,
      );
    }

    const stream = this._streamMapping.get(streamId);

    if (!this._enableJsonResponse) {
      // For SSE responses, generate event ID if event store is provided
      let eventId: string | undefined;

      if (this._eventStore) {
        eventId = await this._eventStore.storeEvent(streamId, message);
      }

      if (stream) {
        // Write the event to the response stream
        await this.writeSSEEvent(stream, message, eventId);
      }
    }

    if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
      this._requestResponseMap.set(requestId, message);

      if (!this._enableJsonResponse && stream) {
        const relatedIds = Array.from(this._requestToStreamMapping.entries())
          .filter(([_, sid]) => sid === streamId)
          .map(([id]) => id);

        // Check if we have responses for all requests using this connection
        const allResponsesReady = relatedIds.every((id) =>
          this._requestResponseMap.has(id),
        );

        if (allResponsesReady) {
          // End the SSE stream
          await stream.close();

          // Clean up
          for (const id of relatedIds) {
            this._requestResponseMap.delete(id);
            this._requestToStreamMapping.delete(id);
          }

          this._streamMapping.delete(streamId);
        }
      }
      // For JSON responses, the handlePostRequest method will handle sending the response
      // when all responses are ready
    }
  }
}
