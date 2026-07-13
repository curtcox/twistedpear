import { describe, expect, it } from "vitest";
import {
  PROPAGATION_DESTINATION_HASH_SIZE,
  isPropagationMessageTooLarge,
  planPropagationRestore,
  planPropagationStore,
  propagationDestinationHash,
  propagationEntryVisibleToRecipient,
  selectOldestPropagationKey,
  type PropagationQuotas
} from "../src/propagation-quota.js";

const quotas: PropagationQuotas = {
  maxBytes: 100,
  maxMessages: 2,
  maxMessageBytes: 50
};

describe("protocol propagation quota", () => {
  it("rejects oversized messages", () => {
    expect(isPropagationMessageTooLarge(51, quotas)).toBe(true);
    expect(planPropagationStore({
      quotas,
      messageBytes: 51,
      alreadyStored: false,
      usedBytes: 0,
      entries: []
    }).kind).toBe("reject-too-large");
  });

  it("short-circuits duplicates", () => {
    expect(
      planPropagationStore({
        quotas,
        messageBytes: 10,
        alreadyStored: true,
        usedBytes: 10,
        entries: [{ key: "a", size: 10, storedAt: 1 }]
      }).kind
    ).toBe("duplicate");
  });

  it("plans oldest-first eviction to free capacity", () => {
    const plan = planPropagationStore({
      quotas,
      messageBytes: 40,
      alreadyStored: false,
      usedBytes: 80,
      entries: [
        { key: "old", size: 40, storedAt: 1 },
        { key: "new", size: 40, storedAt: 2 }
      ]
    });
    expect(plan).toEqual({ kind: "accept", evictKeys: ["old"] });
  });

  it("rejects when eviction cannot free enough space", () => {
    const plan = planPropagationStore({
      quotas: { maxBytes: 30, maxMessages: 10, maxMessageBytes: 50 },
      messageBytes: 40,
      alreadyStored: false,
      usedBytes: 0,
      entries: []
    });
    expect(plan.kind).toBe("reject-capacity");
  });

  it("selects oldest key and destination hash prefix", () => {
    expect(
      selectOldestPropagationKey([
        { key: "b", size: 1, storedAt: 5 },
        { key: "a", size: 1, storedAt: 1 }
      ])
    ).toBe("a");
    const data = new Uint8Array(20).map((_, i) => i);
    expect(propagationDestinationHash(data)).toHaveLength(PROPAGATION_DESTINATION_HASH_SIZE);
    expect(propagationDestinationHash(new Uint8Array(8))).toBeNull();
    const dest = data.subarray(0, 16);
    expect(propagationEntryVisibleToRecipient(dest, null)).toBe(true);
    expect(propagationEntryVisibleToRecipient(dest, dest)).toBe(true);
    expect(propagationEntryVisibleToRecipient(dest, new Uint8Array(16))).toBe(false);
  });

  it("plans propagation restore gates", () => {
    expect(
      planPropagationRestore({
        tooLarge: true,
        alreadyStored: false,
        destinationHashPresent: true
      })
    ).toBe("reject-too-large");
    expect(
      planPropagationRestore({
        tooLarge: false,
        alreadyStored: true,
        destinationHashPresent: true
      })
    ).toBe("duplicate");
    expect(
      planPropagationRestore({
        tooLarge: false,
        alreadyStored: false,
        destinationHashPresent: false
      })
    ).toBe("reject-hash");
    expect(
      planPropagationRestore({
        tooLarge: false,
        alreadyStored: false,
        destinationHashPresent: true
      })
    ).toBe("accept");
  });
});
