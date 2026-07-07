import { AiServiceError, type AiChatBackend, type AiChatRequest, type AiChatResponse } from "./ai.js";

export interface OpenRouterBackendOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly allowedModels?: ReadonlyArray<string>;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

interface OpenRouterChatCompletion {
  readonly model?: string;
  readonly choices?: ReadonlyArray<{ readonly message?: { readonly content?: string } }>;
  readonly usage?: { readonly prompt_tokens?: number; readonly completion_tokens?: number };
  readonly error?: { readonly message?: string };
}

/**
 * OpenRouter-compatible chat-completions backend. The API key stays host-side:
 * mini-apps only ever see the sanitized request/response that crosses the broker.
 */
export function createOpenRouterBackend(options: OpenRouterBackendOptions): AiChatBackend {
  const fetchImpl = options.fetchImpl ?? (globalThis as { fetch?: typeof fetch }).fetch;
  const baseUrl = options.baseUrl.replace(/\/+$/, "");

  return {
    async chat(_appId: string, request: AiChatRequest): Promise<AiChatResponse> {
      if (fetchImpl === undefined) {
        throw new AiServiceError("AI_UNCONFIGURED", "No fetch implementation is available for the AI backend.");
      }

      const model = resolveModel(options, request.model);
      const controller = typeof AbortController === "undefined" ? null : new AbortController();
      const timer =
        controller === null ? null : setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000);

      try {
        const response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${options.apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: request.messages,
            ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
            ...(request.temperature !== undefined ? { temperature: request.temperature } : {})
          }),
          ...(controller === null ? {} : { signal: controller.signal })
        });

        const body = (await response.json().catch(() => ({}))) as OpenRouterChatCompletion;
        if (!response.ok) {
          throw new AiServiceError(
            "AI_BACKEND_ERROR",
            body.error?.message ?? `AI endpoint returned HTTP ${response.status}`
          );
        }

        const content = body.choices?.[0]?.message?.content;
        if (typeof content !== "string") {
          throw new AiServiceError("AI_BACKEND_ERROR", "AI endpoint returned no completion content.");
        }

        return {
          message: { role: "assistant", content },
          model: body.model ?? model,
          usage:
            body.usage === undefined
              ? null
              : {
                  promptTokens: body.usage.prompt_tokens ?? 0,
                  completionTokens: body.usage.completion_tokens ?? 0
                }
        };
      } finally {
        if (timer !== null) {
          clearTimeout(timer);
        }
      }
    }
  };
}

function resolveModel(options: OpenRouterBackendOptions, requested: string | undefined): string {
  if (requested === undefined || requested === options.model) {
    return options.model;
  }

  const allowed = options.allowedModels ?? [];
  if (!allowed.includes(requested)) {
    throw new AiServiceError("AI_BAD_REQUEST", `Model "${requested}" is not on the host allowlist.`);
  }

  return requested;
}
