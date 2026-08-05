import { describe, expect, it } from "vitest";
import { encodePeerInvitation, encodePeerInvitationText, type PeerInvitation } from "@twistedpear/protocol";
import { InvitationPairingDriver, ManualPeerDiscoveryAdapter, PeerDiscoveryRegistry, PeerSessionManager, type ManualDiscoveryChannel, type PeerConnectRequest, type PeerPairingSecurityBackend, type UnconfirmedPeer } from "../src/index.js";

function envelope(role: "offer" | "answer"): Uint8Array {
  const value: PeerInvitation = { version: 1, sessionId: new Uint8Array(16).fill(9), service: "chat", role, peerEphemeralKey: new Uint8Array(32).fill(role === "offer" ? 1 : 2), candidates: [{ kind: "reticulum", value: new Uint8Array([1]) }], display: role === "offer" ? "Alice" : "Bob", issuedAt: 1_000, expiresAt: 61_000, capabilities: ["reticulum"], signature: new Uint8Array(64).fill(3) };
  return encodePeerInvitation(value);
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((next) => { resolve = next; }); return { promise, resolve }; }

class ManualBus {
  readonly offered = deferred<{ session: { id: string; kind: "manual" }; code: string }>();
  readonly answered = deferred<string>();
  channel(side: "offer" | "listen"): ManualDiscoveryChannel {
    const thisBus = this;
    return {
      offer: async function* (session, code) { if (side !== "offer") return; thisBus.offered.resolve({ session, code }); yield await thisBus.answered.promise; },
      accept: async function* () { if (side !== "listen") return; yield await thisBus.offered.promise; },
      async answer(_session, code) { thisBus.answered.resolve(code); }, async cancel() {}
    };
  }
}

function backend(local: "Alice" | "Bob", confirmations: string[]): PeerPairingSecurityBackend {
  const remote = local === "Alice" ? "Bob" : "Alice";
  const peer = { fingerprint: remote.toLowerCase(), displayLabel: remote, matchingWords: ["pear", "link", "safe"], dataPlane: "reticulum" as const } satisfies UnconfirmedPeer;
  return {
    async createOffer() { return { envelope: envelope("offer"), privateState: "offer-secret" }; },
    async authenticateOffer() { return { envelope: envelope("answer"), privateState: "answer-secret", peer }; },
    async authenticateAnswer() { return { privateState: "route", peer }; },
    async confirm(candidate, request) { confirmations.push(`${local}:${candidate.displayLabel}:${request.purpose}`); return true; },
    async establish(context, adapter) { return { authenticated: true, confirmed: true, fingerprint: context.peer.fingerprint, displayLabel: context.peer.displayLabel, rendezvous: adapter.kind, dataPlane: context.peer.dataPlane }; }
  };
}

describe("invitation pairing coordinator", () => {
  it("pairs two hosts over full manual codes only after authentication and confirmation", async () => {
    const bus = new ManualBus(); const confirmations: string[] = [];
    const registryA = new PeerDiscoveryRegistry(); const registryB = new PeerDiscoveryRegistry();
    registryA.register(new ManualPeerDiscoveryAdapter({ channel: bus.channel("offer"), createSessionId: () => "manual", now: () => 2_000 }));
    registryB.register(new ManualPeerDiscoveryAdapter({ channel: bus.channel("listen"), createSessionId: () => "unused", now: () => 2_000 }));
    const a = new PeerSessionManager(registryA, new InvitationPairingDriver({ backend: backend("Alice", confirmations), now: () => 2_000 }));
    const b = new PeerSessionManager(registryB, new InvitationPairingDriver({ backend: backend("Bob", confirmations), now: () => 2_000 }));
    const request = { service: "chat", purpose: "Exchange messages", mechanisms: ["manual"] as const, timeoutMs: 1_000 } satisfies PeerConnectRequest;
    const [aHandle, bHandle] = await Promise.all([a.request("chat", "a", request), b.listen("chat", "b", request)]);
    expect(a.info("chat", "a", aHandle).displayLabel).toBe("Bob"); expect(b.info("chat", "b", bHandle).displayLabel).toBe("Alice");
    expect(confirmations).toEqual(["Bob:Alice:Exchange messages", "Alice:Bob:Exchange messages"]);
  });

  it("rejects a replay before asking the security backend to accept it", async () => {
    let accepted = 0; const security = backend("Bob", []); const original = security.authenticateOffer;
    security.authenticateOffer = async (...args) => { accepted += 1; return original(...args); };
    const driver = new InvitationPairingDriver({ backend: security, now: () => 2_000 });
    const makeAdapter = () => ({ kind: "manual" as const, async availability() { return { state: "available" as const }; }, async *offer() {}, async *accept() { yield { kind: "invitation" as const, session: { id: "s", kind: "manual" as const }, envelope: envelope("offer") }; }, async answer() {}, async cancel() {} });
    const request = { service: "chat", purpose: "Pair", mechanisms: ["manual"] as const, timeoutMs: 1_000 };
    await driver.listen(makeAdapter(), request);
    await expect(driver.listen(makeAdapter(), request)).rejects.toMatchObject({ code: "REPLAY" });
    expect(accepted).toBe(1);
    expect(encodePeerInvitationText(envelope("offer")).length).toBeGreaterThan(0);
  });
});
