import { describe, expect, it } from "vitest";
import {
  decodePeerInvitation,
  decodePeerInvitationText,
  encodePeerInvitation,
  encodePeerInvitationText,
  initialPeerPairingState,
  peerInvitationSigningBytes,
  stepPeerPairing,
  type PeerInvitation,
} from "../src/index.js";

function invitation(overrides: Partial<PeerInvitation> = {}): PeerInvitation {
  return {
    version: 1,
    sessionId: new Uint8Array(16).fill(1),
    service: "chat",
    role: "offer",
    peerEphemeralKey: new Uint8Array(32).fill(2),
    candidates: [{ kind: "reticulum", value: new Uint8Array([3, 4]) }],
    display: "Nearby peer",
    issuedAt: 1_000,
    expiresAt: 61_000,
    capabilities: ["reticulum"],
    signature: new Uint8Array(64).fill(5),
    ...overrides,
  };
}

describe("peer invitation", () => {
  it("has stable canonical CBOR and checksummed text round trips", () => {
    const value = invitation();
    const encoded = encodePeerInvitation(value);
    expect(Buffer.from(encoded).toString("hex")).toBe(
      "ab6176016365787019ee48636961741903e8636b657958200202020202020202020202020202020202020202020202020202020202020202637369645001010101010101010101010101010101637369675840050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505056373766364636861746463616e648182697265746963756c756d420304646361707381697265746963756c756d64726f6c65656f6666657267646973706c61796b4e65617262792070656572",
    );
    expect(encodePeerInvitation(decodePeerInvitation(encoded, 2_000))).toEqual(
      encoded,
    );
    expect(decodePeerInvitationText(encodePeerInvitationText(encoded))).toEqual(
      encoded,
    );
    expect(peerInvitationSigningBytes(value)).not.toEqual(encoded);
  });
  it("rejects expiry, checksum corruption, and oversized candidate lists", () => {
    expect(() =>
      decodePeerInvitation(encodePeerInvitation(invitation()), 61_000),
    ).toThrow(/expired/);
    const text = encodePeerInvitationText(encodePeerInvitation(invitation()));
    expect(() => decodePeerInvitationText(`${text.slice(0, -1)}A`)).toThrow(
      /checksum/,
    );
    expect(() =>
      encodePeerInvitation(
        invitation({
          candidates: Array.from({ length: 9 }, () => ({
            kind: "gateway",
            value: new Uint8Array([1]),
          })),
        }),
      ),
    ).toThrow(/candidates/);
  });
  it("encodes answer envelopes through the same canonical contract", () => {
    expect(
      decodePeerInvitation(
        encodePeerInvitation(invitation({ role: "answer" })),
        2_000,
      ).role,
    ).toBe("answer");
  });

  it("round-trips identity proofs and webrtc candidates", () => {
    const value = invitation({
      identityProof: new Uint8Array(16).fill(9),
      candidates: [{ kind: "webrtc", value: new Uint8Array([7, 8, 9]) }],
    });
    expect(
      decodePeerInvitation(encodePeerInvitation(value), 2_000).identityProof,
    ).toEqual(value.identityProof);
  });

  it("encodes multi-byte CBOR integers for wall-clock lifetimes", () => {
    const issuedAt = 1_700_000_000_000;
    const value = invitation({ issuedAt, expiresAt: issuedAt + 60_000 });
    expect(
      decodePeerInvitation(encodePeerInvitation(value), issuedAt + 1_000)
        .issuedAt,
    ).toBe(issuedAt);
  });

  it("rejects malformed fields before they hit the wire", () => {
    expect(() => encodePeerInvitation(invitation({ version: 2 as 1 }))).toThrow(
      /version/,
    );
    expect(() =>
      encodePeerInvitation(invitation({ role: "relay" as "offer" })),
    ).toThrow(/role/);
    expect(() =>
      encodePeerInvitation(invitation({ sessionId: new Uint8Array(8) })),
    ).toThrow(/session id/);
    expect(() =>
      encodePeerInvitation(invitation({ service: "bad\nname" })),
    ).toThrow(/service/);
    expect(() =>
      encodePeerInvitation(
        invitation({
          candidates: [
            { kind: "ble" as "reticulum", value: new Uint8Array([1]) },
          ],
        }),
      ),
    ).toThrow(/candidate kind/);
    expect(() =>
      encodePeerInvitation(
        invitation({
          capabilities: Array.from({ length: 17 }, (_, i) => `c${i}`),
        }),
      ),
    ).toThrow(/capabilities/);
    expect(() => encodePeerInvitation(invitation({ expiresAt: 500 }))).toThrow(
      /lifetime/,
    );
    expect(() =>
      decodePeerInvitation(encodePeerInvitation(invitation()), 1_000 - 31_000),
    ).toThrow(/expired or not yet valid/);
  });

  it("rejects oversized and truncated encodings", () => {
    expect(() => decodePeerInvitation(new Uint8Array(16_385))).toThrow(
      /size budget/,
    );
    expect(() => decodePeerInvitation(new Uint8Array([0xa0, 0x00]))).toThrow(
      /trailing|map|CBOR|MALFORMED/,
    );
    expect(() => decodePeerInvitationText("A")).toThrow(/too short|invalid/);
    expect(() => decodePeerInvitationText("!!!!")).toThrow(/invalid Base32/);
  });
});

describe("peer pairing machine", () => {
  it("connects a matching session and rejects replay", () => {
    let state = stepPeerPairing(initialPeerPairingState(), {
      kind: "accept",
      sessionId: "s",
      service: "chat",
      expiresAt: 10,
      replayed: false,
    });
    state = stepPeerPairing(state, { kind: "confirm", sessionId: "s" });
    expect(state.phase).toBe("connected");
    expect(
      stepPeerPairing(initialPeerPairingState(), {
        kind: "accept",
        sessionId: "s",
        service: "chat",
        expiresAt: 10,
        replayed: true,
      }).phase,
    ).toBe("rejected");
  });
  it("expires, cancels, and rejects session confusion deterministically", () => {
    const offered = stepPeerPairing(initialPeerPairingState(), {
      kind: "offer",
      sessionId: "a",
      service: "chat",
      expiresAt: 10,
    });
    expect(stepPeerPairing(offered, { kind: "time", now: 10 }).phase).toBe(
      "expired",
    );
    expect(stepPeerPairing(offered, { kind: "cancel" }).phase).toBe(
      "cancelled",
    );
    expect(
      stepPeerPairing(offered, { kind: "answer", sessionId: "b" }).phase,
    ).toBe("rejected");
  });
});
