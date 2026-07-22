import { describe, expect, it } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { decodePeerInvitation, encodePeerInvitation } from "@twistedpear/protocol";
import { CryptoPeerPairingBackend, type CryptoPeerPairingOptions } from "../src/index.js";

function options(seed: number, label: string, candidate: "reticulum" | "webrtc" = "reticulum"): CryptoPeerPairingOptions {
  const privateKey = new Uint8Array(32).fill(seed);
  let entropyCounter = seed;
  return {
    identity: { publicKey: ed25519.getPublicKey(privateKey), async sign(payload) { return ed25519.sign(payload, privateKey); }, async verify(publicKey, payload, signature) { return ed25519.verify(signature, payload, publicKey); } },
    displayLabel: label, capabilities: ["reticulum"],
    async entropy(length) { entropyCounter += 1; return new Uint8Array(length).fill(entropyCounter); },
    async candidates() { return [{ kind: candidate, value: new Uint8Array([seed]) }]; },
    async confirm() { return true; },
    async establish(_context, peer, adapter) { return { authenticated: true, confirmed: true, fingerprint: peer.fingerprint, displayLabel: peer.displayLabel, rendezvous: adapter.kind, dataPlane: peer.dataPlane }; },
    now: () => 1_000
  };
}

describe("cryptographic peer pairing backend", () => {
  it("verifies identity signatures, derives the same SAS, and keeps shared secrets private", async () => {
    const alice = new CryptoPeerPairingBackend(options(1, "Alice")); const bob = new CryptoPeerPairingBackend(options(2, "Bob"));
    const request = { service: "chat", purpose: "Pair", mechanisms: ["manual"] as const, timeoutMs: 1_000 };
    const offer = await alice.createOffer(request); const answer = await bob.authenticateOffer(request, offer.envelope); const authenticated = await alice.authenticateAnswer(request, offer.privateState, answer.envelope);
    expect(authenticated.peer.displayLabel).toBe("Bob"); expect(answer.peer.displayLabel).toBe("Alice");
    expect(authenticated.peer.matchingWords).toEqual(answer.peer.matchingWords); expect(authenticated.peer.matchingWords).toHaveLength(3);
    expect(JSON.stringify(authenticated.peer)).not.toContain("sharedSecret");
  });

  it("rejects tampered signed invitations", async () => {
    const alice = new CryptoPeerPairingBackend(options(3, "Alice")); const bob = new CryptoPeerPairingBackend(options(4, "Bob"));
    const request = { service: "chat", purpose: "Pair", mechanisms: ["manual"] as const, timeoutMs: 1_000 };
    const offer = await alice.createOffer(request); const decoded = decodePeerInvitation(offer.envelope, 1_000); const tampered = encodePeerInvitation({ ...decoded, display: "Mallory" });
    await expect(bob.authenticateOffer(request, tampered)).rejects.toThrow(/signature/);
  });
  it("refuses a signed downgrade when there is no common data plane", async () => {
    const alice = new CryptoPeerPairingBackend(options(5, "Alice", "reticulum")); const bob = new CryptoPeerPairingBackend(options(6, "Bob", "webrtc"));
    const request = { service: "chat", purpose: "Pair", mechanisms: ["manual"] as const, timeoutMs: 1_000 };
    const offer = await alice.createOffer(request);
    await expect(bob.authenticateOffer(request, offer.envelope)).rejects.toMatchObject({ code: "NO_RETURN_CHANNEL" });
  });
});
