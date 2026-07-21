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

export interface AiEmbedRequest {
  readonly inputs: ReadonlyArray<string>;
  readonly model?: string;
}

export interface AiEmbedResponse {
  readonly vectors: ReadonlyArray<ReadonlyArray<number>>;
  readonly model: string;
  readonly usage: { readonly promptTokens: number } | null;
}

export interface AiVectorSearchRequest {
  readonly query: string;
  readonly documents: ReadonlyArray<{ readonly id: string; readonly text: string }>;
  readonly limit?: number;
  readonly model?: string;
}

export interface AiVectorSearchResponse {
  readonly matches: ReadonlyArray<{ readonly id: string; readonly score: number }>;
  readonly model: string;
  readonly usage: { readonly promptTokens: number } | null;
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
  embed?(appId: string, request: AiEmbedRequest): Promise<AiEmbedResponse>;
}

export interface AiServiceLimits {
  readonly maxMessages: number;
  readonly maxTokensCap: number;
  readonly maxEmbeddingInputs: number;
  readonly maxEmbeddingInputChars: number;
  readonly maxEmbeddingDimensions: number;
}

export const DEFAULT_AI_SERVICE_LIMITS: AiServiceLimits = {
  maxMessages: 64,
  maxTokensCap: 8_192,
  maxEmbeddingInputs: 64,
  maxEmbeddingInputChars: 16_384,
  maxEmbeddingDimensions: 4_096
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

  async embed(appId: string, request: AiEmbedRequest): Promise<AiEmbedResponse> {
    const sanitized = this.sanitizeEmbed(request);
    if (this.backend.embed === undefined) {
      throw new AiServiceError("AI_UNCONFIGURED", "Embeddings are not configured on this host.");
    }
    const response = await this.exclusive(appId, () => this.backend.embed!(appId, sanitized));
    if (!Array.isArray(response.vectors) || response.vectors.length !== sanitized.inputs.length) {
      throw new AiServiceError("AI_BACKEND_ERROR", "Embedding endpoint returned the wrong number of vectors.");
    }
    const dimensions = response.vectors[0]?.length ?? 0;
    if (dimensions === 0 || dimensions > this.limits.maxEmbeddingDimensions ||
        response.vectors.some((vector) => !Array.isArray(vector) || vector.length !== dimensions || vector.some((value) => !Number.isFinite(value)))) {
      throw new AiServiceError("AI_BACKEND_ERROR", "Embedding endpoint returned invalid vectors.");
    }
    return response;
  }

  async search(appId: string, request: AiVectorSearchRequest): Promise<AiVectorSearchResponse> {
    if (typeof request?.query !== "string" || request.query.length === 0 || !Array.isArray(request.documents)) {
      throw new AiServiceError("AI_BAD_REQUEST", "Vector search needs a query and documents.");
    }
    if (request.documents.length === 0 || request.documents.length >= this.limits.maxEmbeddingInputs) {
      throw new AiServiceError("AI_BAD_REQUEST", `Vector search supports 1-${this.limits.maxEmbeddingInputs - 1} documents.`);
    }
    const ids = new Set<string>();
    for (const document of request.documents) {
      if (typeof document?.id !== "string" || document.id.length === 0 || document.id.length > 256 || ids.has(document.id) || typeof document?.text !== "string") {
        throw new AiServiceError("AI_BAD_REQUEST", "Vector-search documents need unique 1-256 character ids and string text.");
      }
      ids.add(document.id);
    }
    const response = await this.embed(appId, {
      inputs: [request.query, ...request.documents.map((document) => document.text)],
      ...(request.model === undefined ? {} : { model: request.model })
    });
    const [queryVector, ...documentVectors] = response.vectors;
    if (queryVector === undefined || documentVectors.length !== request.documents.length) {
      throw new AiServiceError("AI_BACKEND_ERROR", "Embedding endpoint returned the wrong number of vectors.");
    }
    const limit = Math.max(1, Math.min(Math.floor(request.limit ?? 5), request.documents.length));
    const matches = request.documents
      .map((document, index) => ({ id: document.id, score: cosineSimilarity(queryVector, documentVectors[index]!) }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, limit);
    return { matches, model: response.model, usage: response.usage };
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

  private async exclusive<T>(appId: string, operation: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(appId)) {
      throw new AiServiceError("AI_BUSY", "An AI request is already in flight for this app.");
    }
    this.inFlight.add(appId);
    try {
      return await operation();
    } catch (error) {
      throw this.backendError(error);
    } finally {
      this.inFlight.delete(appId);
    }
  }

  private sanitizeEmbed(request: AiEmbedRequest): AiEmbedRequest {
    if (!Array.isArray(request?.inputs) || request.inputs.length === 0 || request.inputs.length > this.limits.maxEmbeddingInputs) {
      throw new AiServiceError("AI_BAD_REQUEST", `Embeddings require 1-${this.limits.maxEmbeddingInputs} inputs.`);
    }
    for (const input of request.inputs) {
      if (typeof input !== "string" || input.length === 0 || input.length > this.limits.maxEmbeddingInputChars) {
        throw new AiServiceError("AI_BAD_REQUEST", `Embedding inputs must be 1-${this.limits.maxEmbeddingInputChars} characters.`);
      }
    }
    return { inputs: [...request.inputs], ...(typeof request.model === "string" && request.model.length > 0 ? { model: request.model } : {}) };
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

export function cosineSimilarity(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  if (a.length === 0 || a.length !== b.length) {
    throw new AiServiceError("AI_BACKEND_ERROR", "Embedding vectors must have equal non-zero dimensions.");
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index]!;
    const right = b[index]!;
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      throw new AiServiceError("AI_BACKEND_ERROR", "Embedding vectors must contain finite numbers.");
    }
    dot += left * right;
    normA += left * left;
    normB += right * right;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}
