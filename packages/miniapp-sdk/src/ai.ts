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

export async function chat(request: AiChatRequest): Promise<AiChatResponse> {
  return (await callHost("ai", "chat", request, "ai:chat")) as AiChatResponse;
}
