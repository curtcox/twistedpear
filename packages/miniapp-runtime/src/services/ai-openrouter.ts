import {
  AiServiceError,
  type AiChatBackend,
  type AiChatBackendChunk,
  type AiChatRequest,
  type AiChatResponse,
  type AiChatUsage,
  type AiEmbedRequest,
  type AiEmbedResponse,
} from "./ai.js";

export interface OpenRouterBackendOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly allowedModels?: ReadonlyArray<string>;
  readonly embeddingModel?: string;
  readonly allowedEmbeddingModels?: ReadonlyArray<string>;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;

interface OpenRouterErrorBody {
  readonly error?: { readonly message?: string };
}

interface OpenRouterChatCompletion extends OpenRouterErrorBody {
  readonly model?: string;
  readonly choices?: ReadonlyArray<{
    readonly message?: { readonly content?: string };
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  };
}

interface OpenRouterChatChunk extends OpenRouterErrorBody {
  readonly model?: string;
  readonly choices?: ReadonlyArray<{
    readonly delta?: { readonly content?: string };
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  } | null;
}

interface OpenRouterEmbeddingResponse extends OpenRouterErrorBody {
  readonly model?: string;
  readonly data?: ReadonlyArray<{
    readonly index?: number;
    readonly embedding?: ReadonlyArray<number>;
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly total_tokens?: number;
  };
}

/**
 * OpenRouter-compatible chat-completions backend. The API key stays host-side:
 * mini-apps only ever see the sanitized request/response that crosses the broker.
 */
export function createOpenRouterBackend(
  options: OpenRouterBackendOptions,
): AiChatBackend {
  const configuredFetch =
    options.fetchImpl ?? (globalThis as { fetch?: typeof fetch }).fetch;
  let baseUrl = options.baseUrl;
  while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

  return {
    async chat(
      _appId: string,
      request: AiChatRequest,
    ): Promise<AiChatResponse> {
      const fetchImpl = requireFetch(configuredFetch);
      const model = resolveModel(options, request.model);
      const deadline = startDeadline(options.timeoutMs);
      try {
        const response = await postJson({
          fetchImpl,
          url: `${baseUrl}/chat/completions`,
          apiKey: options.apiKey,
          payload: chatPayload(model, request, false),
          deadline,
        });
        const body = await readJson<OpenRouterChatCompletion>(response);
        failOnError(response, body);
        return {
          message: { role: "assistant", content: completionContent(body) },
          model: body.model ?? model,
          usage: translateUsage(body.usage) ?? null,
        };
      } finally {
        deadline.release();
      }
    },

    async *stream(
      _appId: string,
      request: AiChatRequest,
    ): AsyncIterable<AiChatBackendChunk> {
      const fetchImpl = requireFetch(configuredFetch);
      const model = resolveModel(options, request.model);
      const deadline = startDeadline(options.timeoutMs);
      try {
        const response = await postJson({
          fetchImpl,
          url: `${baseUrl}/chat/completions`,
          apiKey: options.apiKey,
          payload: chatPayload(model, request, true),
          deadline,
          accept: "text/event-stream",
        });
        yield* decodeSseStream(await requireEventStream(response));
      } finally {
        deadline.release();
      }
    },

    async embed(
      _appId: string,
      request: AiEmbedRequest,
    ): Promise<AiEmbedResponse> {
      const fetchImpl = requireFetch(configuredFetch);
      const model = resolveEmbeddingModel(options, request.model);
      const deadline = startDeadline(options.timeoutMs);
      try {
        const response = await postJson({
          fetchImpl,
          url: `${baseUrl}/embeddings`,
          apiKey: options.apiKey,
          payload: { model, input: request.inputs },
          deadline,
        });
        const body = await readJson<OpenRouterEmbeddingResponse>(response);
        failOnError(response, body);
        return {
          vectors: embeddingVectors(body, request.inputs.length),
          model: body.model ?? model,
          usage: translateEmbeddingUsage(body.usage),
        };
      } finally {
        deadline.release();
      }
    },
  };
}

function requireFetch(fetchImpl: typeof fetch | undefined): typeof fetch {
  if (fetchImpl === undefined) {
    throw new AiServiceError(
      "AI_UNCONFIGURED",
      "No fetch implementation is available for the AI backend.",
    );
  }
  return fetchImpl;
}

/** An in-flight request's abort budget, released once the call settles. */
interface RequestDeadline {
  readonly init: { readonly signal?: AbortSignal };
  release(): void;
}

function startDeadline(timeoutMs: number | undefined): RequestDeadline {
  if (typeof AbortController === "undefined") {
    return { init: {}, release: () => undefined };
  }
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  return {
    init: { signal: controller.signal },
    release: () => clearTimeout(timer),
  };
}

interface JsonPost {
  readonly fetchImpl: typeof fetch;
  readonly url: string;
  readonly apiKey: string;
  readonly payload: unknown;
  readonly deadline: RequestDeadline;
  readonly accept?: string;
}

async function postJson(post: JsonPost): Promise<Response> {
  return post.fetchImpl(post.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(post.accept === undefined ? {} : { accept: post.accept }),
      authorization: `Bearer ${post.apiKey}`,
    },
    body: JSON.stringify(post.payload),
    ...post.deadline.init,
  });
}

function chatPayload(
  model: string,
  request: AiChatRequest,
  streaming: boolean,
): Record<string, unknown> {
  return {
    model,
    messages: request.messages,
    ...(streaming
      ? { stream: true, stream_options: { include_usage: true } }
      : {}),
    ...(request.maxTokens === undefined
      ? {}
      : { max_tokens: request.maxTokens }),
    ...(request.temperature === undefined
      ? {}
      : { temperature: request.temperature }),
  };
}

async function readJson<T extends OpenRouterErrorBody>(
  response: Response,
): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

function failOnError(response: Response, body: OpenRouterErrorBody): void {
  if (response.ok) return;
  throw new AiServiceError(
    "AI_BACKEND_ERROR",
    body.error?.message ?? `AI endpoint returned HTTP ${response.status}`,
  );
}

function completionContent(body: OpenRouterChatCompletion): string {
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new AiServiceError(
      "AI_BACKEND_ERROR",
      "AI endpoint returned no completion content.",
    );
  }
  return content;
}

async function requireEventStream(
  response: Response,
): Promise<ReadableStream<Uint8Array>> {
  if (!response.ok) {
    failOnError(response, await readJson<OpenRouterChatCompletion>(response));
  }
  if (response.body === null) {
    throw new AiServiceError(
      "AI_BACKEND_ERROR",
      "AI endpoint returned no response stream.",
    );
  }
  return response.body;
}

async function* decodeSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AiChatBackendChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  try {
    for (;;) {
      const read = await reader.read();
      const done = read.done === true;
      pending += decoder.decode(read.value, { stream: !done });
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? "";
      for (const line of done ? [...lines, pending] : lines) {
        const chunk = parseSseLine(line);
        if (chunk === "done") return;
        if (chunk !== null) yield chunk;
      }
      if (done) return;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function parseSseLine(line: string): AiChatBackendChunk | "done" | null {
  const data = sseData(line);
  if (data === null) return null;
  if (data === "[DONE]") return "done";
  return sseChunk(parseChunkBody(data));
}

/** The payload of a `data:` line, or null for blank lines and comments. */
function sseData(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  return trimmed.slice(5).trim();
}

function parseChunkBody(data: string): OpenRouterChatChunk {
  try {
    return JSON.parse(data) as OpenRouterChatChunk;
  } catch {
    throw new AiServiceError(
      "AI_BACKEND_ERROR",
      "AI endpoint returned malformed stream data.",
    );
  }
}

function sseChunk(body: OpenRouterChatChunk): AiChatBackendChunk | null {
  const failure = body.error?.message;
  if (failure !== undefined) {
    throw new AiServiceError("AI_BACKEND_ERROR", failure);
  }
  const delta = sseDelta(body);
  const usage = translateUsage(body.usage);
  if (delta.length === 0 && usage === undefined && body.model === undefined) {
    return null;
  }
  return {
    delta,
    ...(body.model === undefined ? {} : { model: body.model }),
    ...(usage === undefined ? {} : { usage }),
  };
}

function sseDelta(body: OpenRouterChatChunk): string {
  return body.choices?.[0]?.delta?.content ?? "";
}

function translateUsage(
  usage: OpenRouterChatChunk["usage"],
): AiChatUsage | null | undefined {
  if (usage === undefined) return undefined;
  if (usage === null) return null;
  return {
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
  };
}

function translateEmbeddingUsage(
  usage: OpenRouterEmbeddingResponse["usage"],
): AiEmbedResponse["usage"] {
  if (usage === undefined) return null;
  return { promptTokens: usage.prompt_tokens ?? usage.total_tokens ?? 0 };
}

function embeddingVectors(
  body: OpenRouterEmbeddingResponse,
  expected: number,
): ReadonlyArray<ReadonlyArray<number>> {
  const ordered = [...(body.data ?? [])].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );
  const vectors = ordered.map((entry) => entry.embedding);
  if (
    vectors.length !== expected ||
    vectors.some((vector) => !Array.isArray(vector))
  ) {
    throw new AiServiceError(
      "AI_BACKEND_ERROR",
      "AI endpoint returned invalid embeddings.",
    );
  }
  return vectors as ReadonlyArray<ReadonlyArray<number>>;
}

function resolveModel(
  options: OpenRouterBackendOptions,
  requested: string | undefined,
): string {
  if (requested === undefined || requested === options.model) {
    return options.model;
  }

  const allowed = options.allowedModels ?? [];
  if (!allowed.includes(requested)) {
    throw new AiServiceError(
      "AI_BAD_REQUEST",
      `Model "${requested}" is not on the host allowlist.`,
    );
  }

  return requested;
}

function resolveEmbeddingModel(
  options: OpenRouterBackendOptions,
  requested: string | undefined,
): string {
  const configured = options.embeddingModel;
  if (configured === undefined || configured.length === 0) {
    throw new AiServiceError(
      "AI_UNCONFIGURED",
      "No embedding model is configured on this host.",
    );
  }
  if (requested === undefined || requested === configured) return configured;
  if (!(options.allowedEmbeddingModels ?? []).includes(requested)) {
    throw new AiServiceError(
      "AI_BAD_REQUEST",
      `Embedding model "${requested}" is not on the host allowlist.`,
    );
  }
  return requested;
}
