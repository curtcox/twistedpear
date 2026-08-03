// @ts-nocheck
import { describe, expect, it } from "vitest";
import { MemoryPairingDriver, MemoryPeerDiscoveryAdapter, MemoryPeerDiscoveryHub, PeerDiscoveryRegistry, PeerReplayCache, PeerSessionManager, type PeerDiscoveryAdapter, type PeerDiscoveryKind } from "../src/index.js";

function adapter(kind: PeerDiscoveryKind, state: "available" | "unsupported" = "available"): PeerDiscoveryAdapter {
  return { kind, async availability() { return { state }; }, async *offer() {}, async *accept() {}, async answer() {}, async cancel() {} };
}

describe("peer discovery registry and handles", () => {
  it("selects one available adapter and scopes opaque handles", async () => {
    const registry = new PeerDiscoveryRegistry(); registry.register(adapter("bluetooth", "unsupported")); registry.register(adapter("manual"));
    const manager = new PeerSessionManager(registry, { async request(selected) { return { authenticated: true, confirmed: true, fingerprint: "fp", displayLabel: "Peer", rendezvous: selected.kind, dataPlane: "reticulum" }; }, async listen(selected) { return { authenticated: true, confirmed: true, fingerprint: "fp2", displayLabel: "Peer 2", rendezvous: selected.kind, dataPlane: "gateway" }; } });
    const handle = await manager.request("chat", "run-a", { service: "chat", purpose: "test", mechanisms: "any", timeoutMs: 1000 });
    expect(manager.info("chat", "run-a", handle).rendezvous).toBe("manual");
    expect(manager.list("chat")).toEqual([expect.objectContaining({ handle, displayLabel: "Peer" })]);
    expect(manager.list("other-app")).toEqual([]);
    expect(() => manager.info("chat", "run-b", handle)).toThrow(/Unknown peer handle/);
    await manager.closeRuntime("chat", "run-a");
    expect(manager.info("chat", "run-a", handle).state).toBe("closed");
  });
  it("registers one confirmed route for host services and removes it with the handle", async () => {
    const sent: Uint8Array[] = [];
    const registry = new PeerDiscoveryRegistry(); registry.register(adapter("manual"));
    const manager = new PeerSessionManager(registry, { async request(selected) { return { authenticated: true, confirmed: true, fingerprint: "peer-fp", displayLabel: "Peer", rendezvous: selected.kind, dataPlane: "reticulum", route: { send(payload) { sent.push(payload); } } }; }, async listen(selected) { return { authenticated: true, confirmed: true, fingerprint: "peer-fp", displayLabel: "Peer", rendezvous: selected.kind, dataPlane: "reticulum" }; } });
    const handle = await manager.request("chat", "run", { service: "tp.chat", purpose: "test", mechanisms: "any", timeoutMs: 1_000 });
    expect(manager.routes.resolve("peer-fp", "tp.chat")?.dataPlane).toBe("reticulum");
    await manager.routes.send("peer-fp", new Uint8Array([1, 2, 3]), "tp.chat");
    expect(sent).toEqual([new Uint8Array([1, 2, 3])]);
    await manager.close("chat", "run", handle);
    expect(manager.routes.list()).toEqual([]);
  });
  it("rejects replay until the original invitation expires", () => {
    const cache = new PeerReplayCache(); expect(cache.acceptOnce("session", 10, 0)).toBe(true); expect(cache.acceptOnce("session", 10, 1)).toBe(false); expect(cache.acceptOnce("session", 20, 10)).toBe(true);
  });
  it("pairs two hosts only after both trusted confirmations", async () => {
    const hub = new MemoryPeerDiscoveryHub(); const registryA = new PeerDiscoveryRegistry(); const registryB = new PeerDiscoveryRegistry(); registryA.register(new MemoryPeerDiscoveryAdapter()); registryB.register(new MemoryPeerDiscoveryAdapter());
    const a = new PeerSessionManager(registryA, new MemoryPairingDriver(hub, { fingerprint: "a", displayLabel: "Alice" }, async () => true));
    const b = new PeerSessionManager(registryB, new MemoryPairingDriver(hub, { fingerprint: "b", displayLabel: "Bob" }, async () => true));
    const options = { service: "chat", purpose: "Pair", mechanisms: "any" as const, timeoutMs: 1_000 };
    const [aHandle, bHandle] = await Promise.all([a.request("chat", "a-run", options), b.listen("chat", "b-run", options)]);
    expect(a.info("chat", "a-run", aHandle).displayLabel).toBe("Bob"); expect(b.info("chat", "b-run", bHandle).displayLabel).toBe("Alice");
  });
});
