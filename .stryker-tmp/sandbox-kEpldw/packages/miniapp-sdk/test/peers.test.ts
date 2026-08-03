// @ts-nocheck
import { describe, expect, it } from "vitest";
import { close, diagnostics, PeerError, request } from "../src/peers.js";
import { setMiniappHostTransport } from "../src/rpc.js";

describe("peers SDK", () => {
  it("uses only the peer broker namespace and preserves typed errors", async () => {
    setMiniappHostTransport({ async request(call) { expect(call.namespace).toBe("peers"); expect(call.capability).toBe("peer:connect"); return { id: call.id, ok: true, result: { id: "opaque" } }; } });
    await expect(request({ purpose: "Pair" })).resolves.toEqual({ id: "opaque" });
    setMiniappHostTransport({ async request(call) { return { id: call.id, ok: true, result: [{ kind: "manual", availability: { state: "available" } }] }; } });
    await expect(diagnostics()).resolves.toMatchObject([{ kind: "manual", availability: { state: "available" } }]);
    setMiniappHostTransport({ async request(call) { return { id: call.id, ok: false, error: { code: "CANCELLED", message: "User cancelled" } }; } });
    await expect(close({ id: "opaque" })).rejects.toMatchObject<Partial<PeerError>>({ code: "CANCELLED" });
  });
});
