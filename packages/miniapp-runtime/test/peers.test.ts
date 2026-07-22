import { describe, expect, it } from "vitest";
import { PeerDiscoveryRegistry, PeerSessionManager } from "@twistedpear/peer-discovery";
import { GrantStore, MemoryKvStoreBackend, MiniappHost, PeerBrokerService } from "../src/index.js";

describe("peer broker service", () => {
  it("derives app scope and rejects cross-app names", async () => {
    const registry = new PeerDiscoveryRegistry(); registry.register({ kind: "manual", async availability() { return { state: "available" }; }, async *offer() {}, async *accept() {}, async answer() {}, async cancel() {} });
    const manager = new PeerSessionManager(registry, { async request(adapter, request) { expect(request.service).toBe("chat"); return { authenticated: true, confirmed: true, fingerprint: "fp", displayLabel: "Peer", rendezvous: adapter.kind, dataPlane: "reticulum" }; }, async listen(adapter) { return { authenticated: true, confirmed: true, fingerprint: "fp", displayLabel: "Peer", rendezvous: adapter.kind, dataPlane: "reticulum" }; } });
    const service = new PeerBrokerService(manager);
    await expect(service.diagnostics()).resolves.toMatchObject([{ kind: "manual", availability: { state: "available" } }]);
    await expect(service.request("chat", "run", { purpose: "Exchange a message" })).resolves.toHaveProperty("id");
    await expect(service.request("chat", "run", { service: "other", purpose: "no" })).rejects.toThrow(/Cross-app/);
  });
  it("enforces peer:connect at the shipping broker chokepoint", async () => {
    const registry = new PeerDiscoveryRegistry(); registry.register({ kind: "manual", async availability() { return { state: "available" }; }, async *offer() {}, async *accept() {}, async answer() {}, async cancel() {} });
    const manager = new PeerSessionManager(registry, { async request(adapter) { return { authenticated: true, confirmed: true, fingerprint: "fp", displayLabel: "Peer", rendezvous: adapter.kind, dataPlane: "reticulum" }; }, async listen(adapter) { return { authenticated: true, confirmed: true, fingerprint: "fp", displayLabel: "Peer", rendezvous: adapter.kind, dataPlane: "reticulum" }; } });
    const store = new MemoryKvStoreBackend(); const grants = new GrantStore(store);
    const host = new MiniappHost({ backend: { name: "unused", async spawn() { throw new Error("not used"); } }, grantStore: grants, kvBackend: store, peerSessionManager: manager });
    const manifest = { name: "chat", version: "1", entry: "bundle.js", publisherPublicKey: "publisher", capabilities: ["peer:connect"] };
    const denied = await host.dispatchRaw({ id: "denied", namespace: "peers", method: "request", payload: { purpose: "Pair" } }, manifest, []);
    expect(denied.error?.code).toBe("CAPABILITY_DENIED");
    await host.setGrants("chat", "publisher", ["peer:connect"], ["peer:connect"]);
    const allowed = await host.dispatchRaw({ id: "allowed", namespace: "peers", method: "request", payload: { purpose: "Pair" } }, manifest, ["peer:connect"]);
    expect(allowed.ok).toBe(true);
    const scoped = await host.dispatchRaw({ id: "scoped", namespace: "peers", method: "request", payload: { service: "other", purpose: "Pair" } }, manifest, ["peer:connect"]);
    expect(scoped.error?.code).toBe("PEERS_CROSS_APP_SCOPE");
  });
});
