export type AiChatRole = "system" | "user" | "assistant";

export interface AiChatMessage {
  readonly role: AiChatRole;
  readonly content: string;
}

export interface AiChatRequest {
  readonly messages: ReadonlyArray<AiChatMessage>;
  readonly model?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

export interface AiChatUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
}

export interface AiChatResponse {
  readonly message: { readonly role: "assistant"; readonly content: string };
  readonly model: string;
  readonly usage: AiChatUsage | null;
}

export interface AiChatBackendChunk {
  readonly delta: string;
  readonly model?: string;
  readonly usage?: AiChatUsage | null;
}

export type AiChatStreamEvent =
  | { readonly type: "delta"; readonly delta: string }
  | { readonly type: "done"; readonly response: AiChatResponse };

export interface AiChatBackend {
  chat(appId: string, request: AiChatRequest): Promise<AiChatResponse>;
  stream?(appId: string, request: AiChatRequest): AsyncIterable<AiChatBackendChunk>;
}

export interface AiServiceLimits {
  readonly maxMessages: number;
  readonly maxTokensCap: number;
}

export const DEFAULT_AI_SERVICE_LIMITS: AiServiceLimits = {
  maxMessages: 64,
  maxTokensCap: 8_192
};

const STREAM_DELTA_MIN_CHARS = 32;
const STREAM_DELTA_MAX_DELAY_MS = 100;

export class AiServiceError extends Error {
  constructor(
    readonly code: "AI_UNCONFIGURED" | "AI_BUSY" | "AI_BAD_REQUEST" | "AI_BACKEND_ERROR",
    message: string
  ) {
    super(message);
    this.name = "AiServiceError";
  }
}

const ROLES = new Set<string>(["system", "user", "assistant"]);

export class AiService {
  private readonly limits: AiServiceLimits;
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly backend: AiChatBackend,
    limits: Partial<AiServiceLimits> = {}
  ) {
    this.limits = { ...DEFAULT_AI_SERVICE_LIMITS, ...limits };
  }

  async chat(appId: string, request: AiChatRequest): Promise<AiChatResponse> {
    const sanitized = this.sanitize(request);
    if (this.inFlight.has(appId)) {
      throw new AiServiceError("AI_BUSY", "An AI request is already in flight for this app.");
    }

    this.inFlight.add(appId);
    try {
      return await this.backend.chat(appId, sanitized);
    } catch (error) {
      throw this.backendError(error);
    } finally {
      this.inFlight.delete(appId);
    }
  }

  stream(appId: string, request: AiChatRequest): AsyncIterator<AiChatStreamEvent> {
    const sanitized = this.sanitize(request);
    if (this.inFlight.has(appId)) {
      throw new AiServiceError("AI_BUSY", "An AI request is already in flight for this app.");
    }

    this.inFlight.add(appId);
    const source = this.streamEvents(appId, sanitized)[Symbol.asyncIterator]();
    let finished = false;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      this.inFlight.delete(appId);
    };

    return {
      next: async () => {
        try {
          const result = await source.next();
          if (result.done === true) finish();
          return result;
        } catch (error) {
          finish();
          throw this.backendError(error);
        }
      },
      return: async () => {
        try {
          return source.return === undefined
            ? { done: true, value: undefined }
            : await source.return(undefined);
        } finally {
          finish();
        }
      }
    };
  }

  private async *streamEvents(appId: string, request: AiChatRequest): AsyncGenerator<AiChatStreamEvent> {
    if (this.backend.stream === undefined) {
      const response = await this.backend.chat(appId, request);
      if (response.message.content.length > 0) {
        yield { type: "delta", delta: response.message.content };
      }
      yield { type: "done", response };
      return;
    }

    let content = "";
    let pending = "";
    let lastEmitAt = Date.now();
    let model = request.model ?? "unknown";
    let usage: AiChatUsage | null = null;
    for await (const chunk of this.backend.stream(appId, request)) {
      if (typeof chunk.delta !== "string") {
        throw new AiServiceError("AI_BACKEND_ERROR", "AI stream returned an invalid delta.");
      }
      if (chunk.model !== undefined) model = chunk.model;
      if (chunk.usage !== undefined) usage = chunk.usage;
      if (chunk.delta.length === 0) continue;
      content += chunk.delta;
      pending += chunk.delta;
      if (pending.length >= STREAM_DELTA_MIN_CHARS || Date.now() - lastEmitAt >= STREAM_DELTA_MAX_DELAY_MS) {
        yield { type: "delta", delta: pending };
        pending = "";
        lastEmitAt = Date.now();
      }
    }
    if (pending.length > 0) yield { type: "delta", delta: pending };
    yield {
      type: "done",
      response: { message: { role: "assistant", content }, model, usage }
    };
  }

  private backendError(error: unknown): AiServiceError {
    if (error instanceof AiServiceError) return error;
    return new AiServiceError(
      "AI_BACKEND_ERROR",
      error instanceof Error ? error.message : "AI backend request failed"
    );
  }

  private sanitize(request: AiChatRequest): AiChatRequest {
    if (!Array.isArray(request?.messages) || request.messages.length === 0) {
      throw new AiServiceError("AI_BAD_REQUEST", "AI chat requires at least one message.");
    }

    if (request.messages.length > this.limits.maxMessages) {
      throw new AiServiceError("AI_BAD_REQUEST", `AI chat exceeds ${this.limits.maxMessages} messages.`);
    }

    for (const message of request.messages) {
      if (!ROLES.has(message?.role) || typeof message?.content !== "string") {
        throw new AiServiceError("AI_BAD_REQUEST", "AI chat messages need a valid role and string content.");
      }
    }

    const maxTokens =
      request.maxTokens === undefined
        ? undefined
        : Math.max(1, Math.min(Math.floor(request.maxTokens), this.limits.maxTokensCap));
    const temperature =
      request.temperature === undefined ? undefined : Math.max(0, Math.min(request.temperature, 2));

    return {
      messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
      ...(typeof request.model === "string" && request.model.length > 0 ? { model: request.model } : {}),
      ...(maxTokens !== undefined ? { maxTokens } : {}),
      ...(temperature !== undefined ? { temperature } : {})
    };
  }
}
