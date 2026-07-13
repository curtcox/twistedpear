import { describe, expect, it } from "vitest";
import { Xoshiro128StarStar } from "../../effects/src/adapters/sim/entropy.js";
import {
  LINK_HANDSHAKE_KEY_SIZE,
  LinkHandshakePhase,
  deriveSimSessionKey,
  initialLinkHandshakeState,
  stepLinkHandshakeWithActions
} from "../src/link-handshake.js";

describe("protocol link handshake", () => {
  it("derives the same session key regardless of peer order", () => {
    const a = new Uint8Array(LINK_HANDSHAKE_KEY_SIZE).map((_, i) => i + 1);
    const b = new Uint8Array(LINK_HANDSHAKE_KEY_SIZE).map((_, i) => 100 - i);
    const linkId = new Uint8Array([9, 8, 7, 6]);
    expect([...deriveSimSessionKey(a, b, linkId)]).toEqual([...deriveSimSessionKey(b, a, linkId)]);
  });

  it("establishes from injected entropy via RNS HKDF", () => {
    const entropy = new Xoshiro128StarStar(0xabc);
    const linkId = new Uint8Array([1, 2, 3, 4]);
    let initiator = initialLinkHandshakeState({ role: "initiator", peerId: "b" });
    let responder = initialLinkHandshakeState({ role: "responder", peerId: "a" });

    const beginA = stepLinkHandshakeWithActions(initiator, {
      kind: "handshake/begin",
      at: 0,
      entropy: entropy.randomBytes(LINK_HANDSHAKE_KEY_SIZE),
      linkId
    });
    initiator = beginA.state;
    expect(beginA.actions[0]?.kind).toBe("send-material");

    const beginB = stepLinkHandshakeWithActions(responder, {
      kind: "handshake/begin",
      at: 0,
      entropy: entropy.randomBytes(LINK_HANDSHAKE_KEY_SIZE),
      linkId
    });
    responder = beginB.state;

    initiator = stepLinkHandshakeWithActions(initiator, {
      kind: "handshake/peer-material",
      material: beginB.actions[0]!.material,
      linkId
    }).state;
    responder = stepLinkHandshakeWithActions(responder, {
      kind: "handshake/peer-material",
      material: beginA.actions[0]!.material,
      linkId
    }).state;

    expect(initiator.phase).toBe(LinkHandshakePhase.ESTABLISHED);
    expect(responder.phase).toBe(LinkHandshakePhase.ESTABLISHED);
    expect(initiator.sessionKey).toHaveLength(64);
    expect([...initiator.sessionKey!]).toEqual([...responder.sessionKey!]);
  });

  it("establishes from an adapter-supplied ECDH shared secret", () => {
    const shared = new Uint8Array(32).map((_, i) => i ^ 0x5a);
    const linkId = new Uint8Array([9, 9, 9, 9]);
    const state = stepLinkHandshakeWithActions(
      initialLinkHandshakeState({ role: "initiator", peerId: "b" }),
      { kind: "handshake/shared-secret", sharedSecret: shared, linkId }
    ).state;
    expect(state.phase).toBe(LinkHandshakePhase.ESTABLISHED);
    expect(state.sessionKey).toHaveLength(64);
  });

  it("double-runs identically from the same seed", () => {
    const run = () => {
      const entropy = new Xoshiro128StarStar(42);
      const linkId = new Uint8Array([5, 5, 5, 5]);
      let a = initialLinkHandshakeState({ role: "initiator", peerId: "b" });
      let b = initialLinkHandshakeState({ role: "responder", peerId: "a" });
      const ea = entropy.randomBytes(LINK_HANDSHAKE_KEY_SIZE);
      const eb = entropy.randomBytes(LINK_HANDSHAKE_KEY_SIZE);
      const beginA = stepLinkHandshakeWithActions(a, {
        kind: "handshake/begin",
        at: 1,
        entropy: ea,
        linkId
      });
      const beginB = stepLinkHandshakeWithActions(b, {
        kind: "handshake/begin",
        at: 1,
        entropy: eb,
        linkId
      });
      a = stepLinkHandshakeWithActions(beginA.state, {
        kind: "handshake/peer-material",
        material: beginB.actions[0]!.material,
        linkId
      }).state;
      b = stepLinkHandshakeWithActions(beginB.state, {
        kind: "handshake/peer-material",
        material: beginA.actions[0]!.material,
        linkId
      }).state;
      return [...a.sessionKey!, ...b.sessionKey!];
    };
    expect(run()).toEqual(run());
  });
});
