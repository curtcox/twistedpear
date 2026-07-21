import { callHost } from "./rpc.js";

export interface AiChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface AiChatRequest {
  readonly messages: ReadonlyArray<AiChatMessage>;
  readonly model?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

export interface AiChatResponse {
  readonly message: { readonly role: "assistant"; readonly content: string };
  readonly model: string;
  readonly usage: { readonly promptTokens: number; readonly completionTokens: number } | null;
}

export type AiChatStreamEvent =
  | { readonly type: "delta"; readonly delta: string }
  | { readonly type: "done"; readonly response: AiChatResponse };

export async function chat(request: AiChatRequest): Promise<AiChatResponse> {
  return (await callHost("ai", "chat", request, "ai:chat")) as AiChatResponse;
}

export async function *chatStream(request: AiChatRequest): AsyncGenerator<AiChatStreamEvent> {
  const started = (await callHost(
    "ai",
    "chatStreamStart",
    request,
    "ai:chat"
  )) as { streamId: string };
  let completed = false;
  try {
    while (true) {
      const next = (await callHost(
        "ai",
        "chatStreamNext",
        { streamId: started.streamId },
        "ai:chat"
      )) as IteratorResult<AiChatStreamEvent>;
      if (next.done === true) {
        completed = true;
        return;
      }
      yield next.value;
    }
  } finally {
    if (!completed) {
      await callHost(
        "ai",
        "chatStreamCancel",
        { streamId: started.streamId },
        "ai:chat"
      );
    }
  }
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

export async function embed(request: AiEmbedRequest): Promise<AiEmbedResponse> {
  return (await callHost("ai", "embed", request, "ai:embed")) as AiEmbedResponse;
}

export async function search(request: AiVectorSearchRequest): Promise<AiVectorSearchResponse> {
  return (await callHost("ai", "search", request, "ai:embed")) as AiVectorSearchResponse;
}
