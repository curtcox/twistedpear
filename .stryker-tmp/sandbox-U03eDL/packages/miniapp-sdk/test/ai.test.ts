// @ts-nocheck
import { describe, expect, it } from "vitest";
import { chat, chatStream, embed, search } from "../src/ai.js";
import { setMiniappHostTransport } from "../src/rpc.js";
import type { BrokerRequest, BrokerResponse } from "@twistedpear/miniapp-runtime";

const request = { messages: [{ role: "user" as const, content: "hi" }] };

describe("AI SDK", () => {
  it("keeps non-streaming chat compatible", async () => {
    setMiniappHostTransport({
      async request(brokerRequest): Promise<BrokerResponse> {
        expect(brokerRequest.method).toBe("chat");
        return {
          id: brokerRequest.id,
          ok: true,
          result: { message: { role: "assistant", content: "whole" }, model: "m", usage: null }
        };
      }
    });
    await expect(chat(request)).resolves.toMatchObject({ message: { content: "whole" } });
  });

  it("turns broker stream sessions into an async iterable", async () => {
    const methods: string[] = [];
    const events = [
      { done: false, value: { type: "delta", delta: "hel" } },
      { done: false, value: { type: "delta", delta: "lo" } },
      { done: true }
    ];
    setMiniappHostTransport({
      async request(brokerRequest: BrokerRequest): Promise<BrokerResponse> {
        methods.push(brokerRequest.method);
        const result = brokerRequest.method === "chatStreamStart"
          ? { streamId: "stream-1" }
          : events.shift();
        return { id: brokerRequest.id, ok: true, result };
      }
    });

    const deltas: string[] = [];
    for await (const event of chatStream(request)) {
      if (event.type === "delta") deltas.push(event.delta);
    }
    expect(deltas.join("")).toBe("hello");
    expect(methods).toEqual([
      "chatStreamStart",
      "chatStreamNext",
      "chatStreamNext",
      "chatStreamNext"
    ]);
  });

  it("cancels the host session when a consumer stops early", async () => {
    const methods: string[] = [];
    setMiniappHostTransport({
      async request(brokerRequest): Promise<BrokerResponse> {
        methods.push(brokerRequest.method);
        return {
          id: brokerRequest.id,
          ok: true,
          result: brokerRequest.method === "chatStreamStart"
            ? { streamId: "stream-2" }
            : brokerRequest.method === "chatStreamNext"
              ? { done: false, value: { type: "delta", delta: "first" } }
              : { cancelled: true }
        };
      }
    });

    for await (const _event of chatStream(request)) break;
    expect(methods).toEqual(["chatStreamStart", "chatStreamNext", "chatStreamCancel"]);
  });

  it("forwards embedding and vector-search requests with the separate grant", async () => {
    const seen: Array<{ method: string; capability: string }> = [];
    setMiniappHostTransport({
      async request(brokerRequest): Promise<BrokerResponse> {
        seen.push({ method: brokerRequest.method, capability: brokerRequest.capability });
        return {
          id: brokerRequest.id,
          ok: true,
          result: brokerRequest.method === "embed"
            ? { vectors: [[1, 0]], model: "e", usage: null }
            : { matches: [{ id: "a", score: 1 }], model: "e", usage: null }
        };
      }
    });
    await embed({ inputs: ["pear"] });
    await search({ query: "pear", documents: [{ id: "a", text: "pear" }] });
    expect(seen).toEqual([
      { method: "embed", capability: "ai:embed" },
      { method: "search", capability: "ai:embed" }
    ]);
  });
});
