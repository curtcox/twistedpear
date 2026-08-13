import { describe, expect, it } from "vitest";
import type { BrokerRequest } from "@twistedpear/miniapp-runtime";
import {
  callHost,
  MiniappHostError,
  setMiniappHostTransport,
} from "../src/rpc.js";

function recordInto(
  calls: BrokerRequest[],
  response: (request: BrokerRequest) => unknown = () => ({ ok: true }),
) {
  setMiniappHostTransport({
    request(request) {
      calls.push(request);
      return Promise.resolve(
        response(request) as Awaited<
          ReturnType<import("../src/rpc.js").MiniappHostTransport["request"]>
        >,
      );
    },
  });
}

describe("callHost", () => {
  it("sends a stamped request with the capability and payload", async () => {
    const calls: BrokerRequest[] = [];
    recordInto(calls, (request) => ({
      id: request.id,
      ok: true,
      result: { echoed: true },
    }));
    const before = Date.now();

    const result = await callHost("ui", "render", { tree: [] }, "ui:render");

    expect(result).toEqual({ echoed: true });
    const call = calls[0];
    if (call === undefined) throw new Error("expected a broker call");
    expect(call.namespace).toBe("ui");
    expect(call.method).toBe("render");
    expect(call.capability).toBe("ui:render");
    expect(call.payload).toEqual({ tree: [] });
    expect(call.sentAt).toBeGreaterThanOrEqual(before);
  });

  it("omits capability and payload when the caller supplies neither", async () => {
    const calls: BrokerRequest[] = [];
    recordInto(calls, (request) => ({ id: request.id, ok: true }));

    await callHost("host", "info");

    expect(calls[0]).not.toHaveProperty("capability");
    expect(calls[0]).not.toHaveProperty("payload");
  });

  it("gives every request a distinct id", async () => {
    const calls: BrokerRequest[] = [];
    recordInto(calls, (request) => ({ id: request.id, ok: true }));

    await callHost("host", "info");
    await callHost("host", "info");

    expect(calls[0]?.id).not.toBe(calls[1]?.id);
    expect(calls.every((call) => call.id.startsWith("sdk-"))).toBe(true);
  });

  it("raises a typed error carrying the broker's code and message", async () => {
    recordInto([], (request) => ({
      id: request.id,
      ok: false,
      error: { code: "DENIED", message: "capability not granted" },
    }));

    const error = await callHost("storage.kv", "get", { key: "k" }).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(MiniappHostError);
    expect(error).toMatchObject({
      code: "DENIED",
      message: "capability not granted",
      name: "MiniappHostError",
    });
  });

  it("falls back to a generic code and message for a bare failure", async () => {
    recordInto([], (request) => ({ id: request.id, ok: false }));

    await expect(callHost("storage.kv", "get")).rejects.toMatchObject({
      code: "BROKER_ERROR",
      message: "Host request failed",
    });
  });

  it("refuses to call a host that has not been wired up", async () => {
    setMiniappHostTransport(null as never);

    await expect(callHost("host", "info")).rejects.toThrow(
      "Mini-app host transport has not been initialized",
    );
  });
});
