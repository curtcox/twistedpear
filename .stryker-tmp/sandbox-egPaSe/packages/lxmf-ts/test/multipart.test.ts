// @ts-nocheck
import { describe, expect, it } from "vitest";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  LXMessageMethod,
  MemoryMultipartCheckpointStore,
  MultipartPropagationReceiver,
  sendMultipartPropagation,
  type LXMFRouter
} from "../src/index.js";
import type { LXMessage } from "../src/message.js";

const provider = new NodeCryptoProvider();

function captureSender() {
  const messages: LXMessage[] = [];
  const router = {
    provider,
    async packAndSend(options: { content: Uint8Array; desiredMethod: number }) {
      const message = {
        content: options.content.slice(),
        sourceHash: new Uint8Array(16).fill(1),
        destinationHash: new Uint8Array(16).fill(2),
        method: options.desiredMethod,
        signatureValidated: true
      } as LXMessage;
      messages.push(message);
      return message;
    }
  } as unknown as LXMFRouter;
  return { router, messages };
}

describe("multipart propagation", () => {
  it("resumes from a persisted checkpoint and reassembles out of order", async () => {
    const content = Uint8Array.from({ length: 500 }, (_, index) => index % 251);
    const { router, messages } = captureSender();
    const sent = await sendMultipartPropagation({
      router,
      destination: {} as never,
      source: {} as never,
      content,
      transferId: new Uint8Array(16).fill(7),
      now: () => 1
    });
    expect(sent.chunkCount).toBe(16);
    expect(messages.every((message) => message.method === LXMessageMethod.PROPAGATED)).toBe(true);

    const store = new MemoryMultipartCheckpointStore();
    const firstReceiver = new MultipartPropagationReceiver(provider, store);
    expect(firstReceiver.ingest(messages[14]!).complete).toBe(false);

    const resumedReceiver = new MultipartPropagationReceiver(provider, store);
    let completed: Uint8Array | null = null;
    for (const message of messages.filter((_message, index) => index !== 14).reverse()) {
      completed = resumedReceiver.ingest(message).content ?? completed;
    }
    expect(completed).toEqual(content);
  });

  it("sends only missing chunks when the sender resumes", async () => {
    const { router, messages } = captureSender();
    const result = await sendMultipartPropagation({
      router,
      destination: {} as never,
      source: {} as never,
      content: new Uint8Array(300),
      completedChunks: new Set([0, 2]),
      now: () => 1
    });
    expect(result.sentChunks).toEqual([1, 3, 4, 5, 6, 7, 8, 9]);
    expect(messages).toHaveLength(8);
  });

  it("enforces the caller's transfer budget", async () => {
    const { router } = captureSender();
    await expect(sendMultipartPropagation({
      router,
      destination: {} as never,
      source: {} as never,
      content: new Uint8Array(129),
      budgetBytes: 128
    })).rejects.toThrow("exceeds budget");
    await expect(sendMultipartPropagation({
      router,
      destination: {} as never,
      source: {} as never,
      content: new Uint8Array(1),
      budgetBytes: Number.NaN
    })).rejects.toThrow("positive integer");
    await expect(sendMultipartPropagation({
      router,
      destination: {} as never,
      source: {} as never,
      content: new Uint8Array(1),
      title: "x".repeat(17)
    })).rejects.toThrow("title exceeds");
  });

  it("rejects a transfer above the receiver's budget before checkpointing", async () => {
    const { router, messages } = captureSender();
    await sendMultipartPropagation({
      router,
      destination: {} as never,
      source: {} as never,
      content: new Uint8Array(96),
      now: () => 1
    });
    const receiver = new MultipartPropagationReceiver(
      provider,
      new MemoryMultipartCheckpointStore(),
      64
    );
    expect(() => receiver.ingest(messages[0]!)).toThrow("receive budget");
  });

  it("rejects a recognized frame that did not pass LXMF authentication", async () => {
    const { router, messages } = captureSender();
    await sendMultipartPropagation({
      router,
      destination: {} as never,
      source: {} as never,
      content: new Uint8Array(64),
      now: () => 1
    });
    messages[0]!.signatureValidated = false;
    expect(() => new MultipartPropagationReceiver(provider).ingest(messages[0]!))
      .toThrow("not authenticated");
  });
});
