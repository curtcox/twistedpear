import { describe, expect, it, vi } from "vitest";
import { dispatchWorkerBrokerMessage } from "../src/sandbox/broker-dispatch.js";
import {
  encodeJsonWireValue,
  isJsonWireBytes,
  reviveJsonWireValue,
} from "../src/sandbox/json-wire.js";
import { prepareBundleSource } from "../src/sandbox/prepare-bundle.js";

describe("sandbox broker dispatch", () => {
  it("fails closed when no endpoint exists", () => {
    const postMessage = vi.fn();
    dispatchWorkerBrokerMessage(
      { type: "broker-request", id: "request" },
      { worker: { postMessage }, pending: new Map() },
    );
    expect(postMessage).toHaveBeenCalledWith({
      type: "broker-response",
      id: "request",
      ok: false,
      error: { message: "Broker endpoint is not configured" },
    });
  });

  it("normalizes successful endpoint responses", async () => {
    const postMessage = vi.fn();
    dispatchWorkerBrokerMessage(
      { type: "broker-request", id: "request" },
      {
        worker: { postMessage },
        pending: new Map(),
        endpoint: { request: async () => ({ ignored: true }) },
        normalizeResponse: () => ({ id: "request", ok: true, result: 7 }),
      },
    );
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledOnce());
    expect(postMessage).toHaveBeenCalledWith({
      type: "broker-response",
      id: "request",
      ok: true,
      result: 7,
    });
  });

  it("returns endpoint errors to the worker", async () => {
    const postMessage = vi.fn();
    dispatchWorkerBrokerMessage(
      { type: "broker-request", id: "request" },
      {
        worker: { postMessage },
        pending: new Map(),
        endpoint: { request: async () => Promise.reject(new Error("denied")) },
      },
    );
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledOnce());
    expect(postMessage.mock.calls[0]?.[0]).toMatchObject({
      id: "request",
      ok: false,
      error: { message: "denied" },
    });
  });

  it("settles and removes response waiters", () => {
    const resolve = vi.fn();
    const reject = vi.fn();
    const pending = new Map([["response", { resolve, reject }]]);
    dispatchWorkerBrokerMessage(
      { type: "broker-response", id: "response", ok: true, result: 9 },
      { worker: { postMessage: vi.fn() }, pending },
    );
    expect(resolve).toHaveBeenCalledWith(9);
    expect(reject).not.toHaveBeenCalled();
    expect(pending.has("response")).toBe(false);
  });

  it("rejects failed responses and ignores unknown messages", () => {
    const reject = vi.fn();
    const pending = new Map([["response", { resolve: vi.fn(), reject }]]);
    const worker = { postMessage: vi.fn() };
    dispatchWorkerBrokerMessage(
      { type: "broker-response", id: "response", ok: false },
      { worker, pending },
    );
    dispatchWorkerBrokerMessage(
      { type: "other", id: "ignored" },
      { worker, pending },
    );
    expect(reject).toHaveBeenCalledWith(new Error("Broker request failed"));
    expect(worker.postMessage).not.toHaveBeenCalled();
  });
});

describe("sandbox JSON wire", () => {
  it("encodes and revives nested byte arrays", () => {
    const encoded = encodeJsonWireValue({ value: [new Uint8Array([1, 2])] });
    expect(encoded).toEqual({ value: [{ __tp: "u8", d: [1, 2] }] });
    expect(reviveJsonWireValue(encoded)).toEqual({
      value: [new Uint8Array([1, 2])],
    });
  });

  it("recognizes only the tagged byte shape", () => {
    expect(isJsonWireBytes({ __tp: "u8", d: [1] })).toBe(true);
    expect(isJsonWireBytes(null)).toBe(false);
    expect(isJsonWireBytes({ __tp: "u8", d: "1" })).toBe(false);
  });

  it("revives legacy dense objects, numeric arrays, and Buffers", () => {
    expect(reviveJsonWireValue({ 0: 3, 1: 4 })).toEqual(new Uint8Array([3, 4]));
    expect(reviveJsonWireValue([5, 6])).toEqual(new Uint8Array([5, 6]));
    expect(reviveJsonWireValue({ type: "Buffer", data: [7] })).toEqual(
      new Uint8Array([7]),
    );
  });

  it("does not coerce sparse or non-numeric objects", () => {
    expect(reviveJsonWireValue({ 1: 4 })).toEqual({ 1: 4 });
    expect(reviveJsonWireValue({ 0: "four" })).toEqual({ 0: "four" });
    const bytes = new Uint8Array([8]);
    expect(reviveJsonWireValue(bytes)).toBe(bytes);
  });
});

describe("sandbox bundle preparation", () => {
  it("rewrites SDK imports to the injected global", () => {
    expect(
      prepareBundleSource(
        'import { render, send as transmit } from "@twistedpear/miniapp-sdk";\nrender();',
      ),
    ).toBe("const { render, send as transmit } = sdk;\nrender();");
    expect(
      prepareBundleSource(
        "\"use strict\";\nimport { render } from '@twistedpear/miniapp-sdk';\nrender();",
      ),
    ).toBe('"use strict";\nconst { render } = sdk;\nrender();');
  });

  it("leaves unrelated sources unchanged", () => {
    expect(prepareBundleSource("export const value = 1;")).toBe(
      "export const value = 1;",
    );
  });
});
