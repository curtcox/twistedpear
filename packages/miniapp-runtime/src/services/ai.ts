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

export interface AiChatBackend {
  chat(appId: string, request: AiChatRequest): Promise<AiChatResponse>;
}

export interface AiServiceLimits {
  readonly maxMessages: number;
  readonly maxTokensCap: number;
}

export const DEFAULT_AI_SERVICE_LIMITS: AiServiceLimits = {
  maxMessages: 64,
  maxTokensCap: 8_192
};

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
      if (error instanceof AiServiceError) {
        throw error;
      }

      throw new AiServiceError(
        "AI_BACKEND_ERROR",
        error instanceof Error ? error.message : "AI backend request failed"
      );
    } finally {
      this.inFlight.delete(appId);
    }
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
