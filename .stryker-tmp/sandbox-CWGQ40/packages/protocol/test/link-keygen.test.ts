// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  LINK_INITIATOR_ENTROPY_SIZE,
  LINK_RESPONDER_ENTROPY_SIZE,
  initialSplitInitiatorLinkEntropyState,
  initialSplitResponderLinkEntropyState,
  initiatorLinkEntropyFieldsFromActions,
  responderLinkEntropyFieldsFromActions,
  shouldRejectSplitInitiatorLinkEntropy,
  shouldRejectSplitResponderLinkEntropy,
  shouldUseSplitInitiatorLinkEntropy,
  shouldUseSplitResponderLinkEntropy,
  splitInitiatorLinkEntropy,
  splitResponderLinkEntropy,
  stepSplitInitiatorLinkEntropyWithActions,
  stepSplitResponderLinkEntropyWithActions
} from "../src/link-keygen.js";

describe("protocol link keygen entropy", () => {
  it("splits initiator entropy into two keys", () => {
    const entropy = new Uint8Array(LINK_INITIATOR_ENTROPY_SIZE).map((_, i) => i + 1);
    const keys = splitInitiatorLinkEntropy(entropy);
    expect(keys.privateKey).toHaveLength(32);
    expect(keys.signaturePrivateKey).toHaveLength(32);
    expect([...keys.privateKey]).toEqual([...entropy.subarray(0, 32)]);
    expect([...keys.signaturePrivateKey]).toEqual([...entropy.subarray(32, 64)]);
  });

  it("splits responder entropy into one key", () => {
    const entropy = new Uint8Array(LINK_RESPONDER_ENTROPY_SIZE).map((_, i) => 200 - i);
    const keys = splitResponderLinkEntropy(entropy);
    expect([...keys.privateKey]).toEqual([...entropy]);
  });

  it("rejects short entropy", () => {
    expect(() => splitInitiatorLinkEntropy(new Uint8Array(63))).toThrow(/at least 64/);
    expect(() => splitResponderLinkEntropy(new Uint8Array(31))).toThrow(/at least 32/);
  });

  it("emits use-fields|reject actions for initiator entropy split", () => {
    const entropy = new Uint8Array(LINK_INITIATOR_ENTROPY_SIZE).map((_, i) => i + 1);
    const ok = stepSplitInitiatorLinkEntropyWithActions(initialSplitInitiatorLinkEntropyState(), {
      kind: "link-keygen/split-initiator-gate",
      entropy
    });
    expect(shouldUseSplitInitiatorLinkEntropy(ok.actions)).toBe(true);
    expect(shouldRejectSplitInitiatorLinkEntropy(ok.actions)).toBe(false);
    const fields = initiatorLinkEntropyFieldsFromActions(ok.actions)!;
    expect([...fields.privateKey]).toEqual([...entropy.subarray(0, 32)]);
    expect([...fields.signaturePrivateKey]).toEqual([...entropy.subarray(32, 64)]);

    const rejected = stepSplitInitiatorLinkEntropyWithActions(
      initialSplitInitiatorLinkEntropyState(),
      {
        kind: "link-keygen/split-initiator-gate",
        entropy: new Uint8Array(63)
      }
    );
    expect(shouldRejectSplitInitiatorLinkEntropy(rejected.actions)).toBe(true);
    expect(initiatorLinkEntropyFieldsFromActions(rejected.actions)).toBeNull();
  });

  it("emits use-fields|reject actions for responder entropy split", () => {
    const entropy = new Uint8Array(LINK_RESPONDER_ENTROPY_SIZE).map((_, i) => 200 - i);
    const ok = stepSplitResponderLinkEntropyWithActions(initialSplitResponderLinkEntropyState(), {
      kind: "link-keygen/split-responder-gate",
      entropy
    });
    expect(shouldUseSplitResponderLinkEntropy(ok.actions)).toBe(true);
    expect(shouldRejectSplitResponderLinkEntropy(ok.actions)).toBe(false);
    const fields = responderLinkEntropyFieldsFromActions(ok.actions)!;
    expect([...fields.privateKey]).toEqual([...entropy]);

    const rejected = stepSplitResponderLinkEntropyWithActions(
      initialSplitResponderLinkEntropyState(),
      {
        kind: "link-keygen/split-responder-gate",
        entropy: new Uint8Array(31)
      }
    );
    expect(shouldRejectSplitResponderLinkEntropy(rejected.actions)).toBe(true);
    expect(responderLinkEntropyFieldsFromActions(rejected.actions)).toBeNull();
  });

  it("is deterministic for identical link-keygen events", () => {
    const entropy = new Uint8Array(LINK_INITIATOR_ENTROPY_SIZE).fill(7);
    const event = {
      kind: "link-keygen/split-initiator-gate" as const,
      entropy
    };
    const a = stepSplitInitiatorLinkEntropyWithActions(
      initialSplitInitiatorLinkEntropyState(),
      event
    );
    const b = stepSplitInitiatorLinkEntropyWithActions(
      initialSplitInitiatorLinkEntropyState(),
      event
    );
    expect(a).toEqual(b);
  });
});
