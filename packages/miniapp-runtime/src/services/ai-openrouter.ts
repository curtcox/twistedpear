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

interface OpenRouterChatCompletion {
  readonly model?: string;
  readonly choices?: ReadonlyArray<{
    readonly message?: { readonly content?: string };
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  };
  readonly error?: { readonly message?: string };
}

interface OpenRouterChatChunk {
  readonly model?: string;
  readonly choices?: ReadonlyArray<{
    readonly delta?: { readonly content?: string };
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
  } | null;
  readonly error?: { readonly message?: string };
}

interface OpenRouterEmbeddingResponse {
  readonly model?: string;
  readonly data?: ReadonlyArray<{
    readonly index?: number;
    readonly embedding?: ReadonlyArray<number>;
  }>;
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly total_tokens?: number;
  };
  readonly error?: { readonly message?: string };
}

/**
 * OpenRouter-compatible chat-completions backend. The API key stays host-side:
 * mini-apps only ever see the sanitized request/response that crosses the broker.
 */
export function createOpenRouterBackend(
  options: OpenRouterBackendOptions,
): AiChatBackend {
  const fetchImpl =
    options.fetchImpl ?? (globalThis as { fetch?: typeof fetch }).fetch;
  const baseUrl = options.baseUrl.replace(/\/+$/, "");

  return {
    async chat(
      _appId: string,
      request: AiChatRequest,
    ): Promise<AiChatResponse> {
      if (fetchImpl === undefined) {
        throw new AiServiceError(
          "AI_UNCONFIGURED",
          "No fetch implementation is available for the AI backend.",
        );
      }

      const model = resolveModel(options, request.model);
      const controller =
        typeof AbortController === "undefined" ? null : new AbortController();
      const timer =
        controller === null
          ? null
          : setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000);

      try {
        const response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: request.messages,
            ...(request.maxTokens !== undefined
              ? { max_tokens: request.maxTokens }
              : {}),
            ...(request.temperature !== undefined
              ? { temperature: request.temperature }
              : {}),
          }),
          ...(controller === null ? {} : { signal: controller.signal }),
        });

        const body = (await response
          .json()
          .catch(() => ({}))) as OpenRouterChatCompletion;
        if (!response.ok) {
          throw new AiServiceError(
            "AI_BACKEND_ERROR",
            body.error?.message ??
              `AI endpoint returned HTTP ${response.status}`,
          );
        }

        const content = body.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
          throw new AiServiceError(
            "AI_BACKEND_ERROR",
            "AI endpoint returned no completion content.",
          );
        }

        return {
          message: { role: "assistant", content },
          model: body.model ?? model,
          usage:
            body.usage === undefined
              ? null
              : {
                  promptTokens: body.usage.prompt_tokens ?? 0,
                  completionTokens: body.usage.completion_tokens ?? 0,
                },
        };
      } finally {
        if (timer !== null) {
          clearTimeout(timer);
        }
      }
    },

    async *stream(
      _appId: string,
      request: AiChatRequest,
    ): AsyncIterable<AiChatBackendChunk> {
      if (fetchImpl === undefined) {
        throw new AiServiceError(
          "AI_UNCONFIGURED",
          "No fetch implementation is available for the AI backend.",
        );
      }

      const model = resolveModel(options, request.model);
      const controller =
        typeof AbortController === "undefined" ? null : new AbortController();
      const timer =
        controller === null
          ? null
          : setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000);
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      try {
        const response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "text/event-stream",
            authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: request.messages,
            stream: true,
            stream_options: { include_usage: true },
            ...(request.maxTokens !== undefined
              ? { max_tokens: request.maxTokens }
              : {}),
            ...(request.temperature !== undefined
              ? { temperature: request.temperature }
              : {}),
          }),
          ...(controller === null ? {} : { signal: controller.signal }),
        });

        if (!response.ok) {
          const body = (await response
            .json()
            .catch(() => ({}))) as OpenRouterChatCompletion;
          throw new AiServiceError(
            "AI_BACKEND_ERROR",
            body.error?.message ??
              `AI endpoint returned HTTP ${response.status}`,
          );
        }
        if (response.body === null) {
          throw new AiServiceError(
            "AI_BACKEND_ERROR",
            "AI endpoint returned no response stream.",
          );
        }

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = "";
        for (;;) {
          const read = await reader.read();
          pending += decoder.decode(read.value, { stream: read.done !== true });
          const lines = pending.split(/\r?\n/);
          pending = lines.pop() ?? "";
          for (const line of lines) {
            const chunk = parseSseLine(line);
            if (chunk === "done") return;
            if (chunk !== null) yield chunk;
          }
          if (read.done === true) {
            const chunk = parseSseLine(pending);
            if (chunk !== null && chunk !== "done") yield chunk;
            return;
          }
        }
      } finally {
        if (reader !== null) {
          await reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
        if (timer !== null) clearTimeout(timer);
      }
    },

    async embed(
      _appId: string,
      request: AiEmbedRequest,
    ): Promise<AiEmbedResponse> {
      if (fetchImpl === undefined || !options.embeddingModel) {
        throw new AiServiceError(
          "AI_UNCONFIGURED",
          "No embedding model is configured on this host.",
        );
      }
      const model = resolveEmbeddingModel(options, request.model);
      const controller =
        typeof AbortController === "undefined" ? null : new AbortController();
      const timer =
        controller === null
          ? null
          : setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000);
      try {
        const response = await fetchImpl(`${baseUrl}/embeddings`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${options.apiKey}`,
          },
          body: JSON.stringify({ model, input: request.inputs }),
          ...(controller === null ? {} : { signal: controller.signal }),
        });
        const body = (await response
          .json()
          .catch(() => ({}))) as OpenRouterEmbeddingResponse;
        if (!response.ok) {
          throw new AiServiceError(
            "AI_BACKEND_ERROR",
            body.error?.message ??
              `AI endpoint returned HTTP ${response.status}`,
          );
        }
        const ordered = [...(body.data ?? [])].sort(
          (a, b) => (a.index ?? 0) - (b.index ?? 0),
        );
        const vectors = ordered.map((entry) => entry.embedding);
        if (
          vectors.length !== request.inputs.length ||
          vectors.some((vector) => !Array.isArray(vector))
        ) {
          throw new AiServiceError(
            "AI_BACKEND_ERROR",
            "AI endpoint returned invalid embeddings.",
          );
        }
        return {
          vectors: vectors as ReadonlyArray<ReadonlyArray<number>>,
          model: body.model ?? model,
          usage:
            body.usage === undefined
              ? null
              : {
                  promptTokens:
                    body.usage.prompt_tokens ?? body.usage.total_tokens ?? 0,
                },
        };
      } finally {
        if (timer !== null) clearTimeout(timer);
      }
    },
  };
}

function parseSseLine(line: string): AiChatBackendChunk | "done" | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith(":")) return null;
  if (!trimmed.startsWith("data:")) return null;
  const data = trimmed.slice(5).trim();
  if (data === "[DONE]") return "done";

  let body: OpenRouterChatChunk;
  try {
    body = JSON.parse(data) as OpenRouterChatChunk;
  } catch {
    throw new AiServiceError(
      "AI_BACKEND_ERROR",
      "AI endpoint returned malformed stream data.",
    );
  }
  if (body.error?.message !== undefined) {
    throw new AiServiceError("AI_BACKEND_ERROR", body.error.message);
  }
  const delta = body.choices?.[0]?.delta?.content ?? "";
  const usage = translateUsage(body.usage);
  if (delta.length === 0 && usage === undefined && body.model === undefined)
    return null;
  return {
    delta,
    ...(body.model === undefined ? {} : { model: body.model }),
    ...(usage === undefined ? {} : { usage }),
  };
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
  if (configured === undefined) {
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
