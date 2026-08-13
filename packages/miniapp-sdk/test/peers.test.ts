import { describe, expect, it } from "vitest";
import {
  close,
  diagnostics,
  info,
  listen,
  PeerError,
  request,
} from "../src/peers.js";
import { setMiniappHostTransport } from "../src/rpc.js";

describe("peers SDK", () => {
  it("uses only the peer broker namespace and preserves typed errors", async () => {
    setMiniappHostTransport({
      async request(call) {
        expect(call.namespace).toBe("peers");
        expect(call.capability).toBe("peer:connect");
        return { id: call.id, ok: true, result: { id: "opaque" } };
      },
    });
    await expect(request({ purpose: "Pair" })).resolves.toEqual({
      id: "opaque",
    });
    setMiniappHostTransport({
      async request(call) {
        return {
          id: call.id,
          ok: true,
          result: [{ kind: "manual", availability: { state: "available" } }],
        };
      },
    });
    await expect(diagnostics()).resolves.toMatchObject([
      { kind: "manual", availability: { state: "available" } },
    ]);
    setMiniappHostTransport({
      async request(call) {
        return {
          id: call.id,
          ok: false,
          error: { code: "CANCELLED", message: "User cancelled" },
        };
      },
    });
    await expect(close({ id: "opaque" })).rejects.toMatchObject<
      Partial<PeerError>
    >({ code: "CANCELLED" });
  });

  it("routes listen and info through the same peer capability", async () => {
    const calls: Array<{ method: string; payload?: unknown }> = [];
    setMiniappHostTransport({
      async request(call) {
        calls.push({ method: call.method, payload: call.payload });
        return { id: call.id, ok: true, result: { id: "opaque" } };
      },
    });

    await listen({ purpose: "Wait for a pairing" });
    await info({ id: "opaque" });

    expect(calls).toEqual([
      { method: "listen", payload: { purpose: "Wait for a pairing" } },
      { method: "info", payload: { handle: { id: "opaque" } } },
    ]);
  });

  it("passes through failures that are not broker errors", async () => {
    setMiniappHostTransport({
      request() {
        return Promise.reject(new Error("transport closed"));
      },
    });

    const error = await diagnostics().catch((thrown: unknown) => thrown);

    expect(error).not.toBeInstanceOf(PeerError);
    expect(error).toMatchObject({ message: "transport closed" });
  });
});
