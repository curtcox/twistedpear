import { describe, expect, it } from "vitest";
import {
  PROPAGATION_DESTINATION_HASH_SIZE,
  initialPropagationStoreState,
  isPropagationMessageTooLarge,
  planPropagationRestore,
  planPropagationStore,
  propagationDestinationHash,
  propagationEntryVisibleToRecipient,
  propagationStoreAcceptEvictKeys,
  selectOldestPropagationKey,
  shouldAcceptPropagationStore,
  shouldApplyPropagationRestore,
  shouldCommitPropagationStoreEntry,
  shouldDeletePropagationCatalogEntry,
  shouldDuplicatePropagationStore,
  shouldEvictOldestPropagationEntry,
  shouldEvictPropagationCatalogEntry,
  shouldRejectPropagationStore,
  stepPropagationStoreWithActions,
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
    expect(
      shouldApplyPropagationRestore({ planAccept: true, destinationHashPresent: true })
    ).toBe(true);
    expect(
      shouldApplyPropagationRestore({ planAccept: true, destinationHashPresent: false })
    ).toBe(false);
    expect(
      shouldApplyPropagationRestore({ planAccept: false, destinationHashPresent: true })
    ).toBe(false);
    expect(shouldCommitPropagationStoreEntry(true)).toBe(true);
    expect(shouldCommitPropagationStoreEntry(false)).toBe(false);
    expect(shouldDeletePropagationCatalogEntry(true)).toBe(true);
    expect(shouldDeletePropagationCatalogEntry(false)).toBe(false);
    expect(shouldEvictPropagationCatalogEntry(true)).toBe(true);
    expect(shouldEvictPropagationCatalogEntry(false)).toBe(false);
    expect(
      shouldEvictOldestPropagationEntry({ oldestKeyPresent: true, entryPresent: true })
    ).toBe(true);
    expect(
      shouldEvictOldestPropagationEntry({ oldestKeyPresent: true, entryPresent: false })
    ).toBe(false);
    expect(
      shouldEvictOldestPropagationEntry({ oldestKeyPresent: false, entryPresent: true })
    ).toBe(false);
  });

  it("emits reject / duplicate / accept actions from store/received", () => {
    const tooLarge = stepPropagationStoreWithActions(initialPropagationStoreState(), {
      kind: "store/received",
      quotas,
      messageBytes: 51,
      alreadyStored: false,
      usedBytes: 0,
      entries: [],
      destinationHashPresent: true
    });
    expect(shouldRejectPropagationStore(tooLarge.actions)).toBe(true);
    expect(shouldAcceptPropagationStore(tooLarge.actions)).toBe(false);

    const duplicate = stepPropagationStoreWithActions(initialPropagationStoreState(), {
      kind: "store/received",
      quotas,
      messageBytes: 10,
      alreadyStored: true,
      usedBytes: 10,
      entries: [{ key: "a", size: 10, storedAt: 1 }],
      destinationHashPresent: true
    });
    expect(shouldDuplicatePropagationStore(duplicate.actions)).toBe(true);
    expect(shouldRejectPropagationStore(duplicate.actions)).toBe(false);

    const accepted = stepPropagationStoreWithActions(initialPropagationStoreState(), {
      kind: "store/received",
      quotas,
      messageBytes: 40,
      alreadyStored: false,
      usedBytes: 80,
      entries: [
        { key: "old", size: 40, storedAt: 1 },
        { key: "new", size: 40, storedAt: 2 }
      ],
      destinationHashPresent: true
    });
    expect(shouldAcceptPropagationStore(accepted.actions)).toBe(true);
    expect(propagationStoreAcceptEvictKeys(accepted.actions)).toEqual(["old"]);

    const missingHash = stepPropagationStoreWithActions(initialPropagationStoreState(), {
      kind: "store/received",
      quotas,
      messageBytes: 10,
      alreadyStored: false,
      usedBytes: 0,
      entries: [],
      destinationHashPresent: false
    });
    expect(shouldRejectPropagationStore(missingHash.actions)).toBe(true);

    const capacity = stepPropagationStoreWithActions(initialPropagationStoreState(), {
      kind: "store/received",
      quotas: { maxBytes: 30, maxMessages: 10, maxMessageBytes: 50 },
      messageBytes: 40,
      alreadyStored: false,
      usedBytes: 0,
      entries: [],
      destinationHashPresent: true
    });
    expect(shouldRejectPropagationStore(capacity.actions)).toBe(true);

    expect(
      stepPropagationStoreWithActions(initialPropagationStoreState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for store receive events", () => {
    const state = initialPropagationStoreState();
    const event = {
      kind: "store/received" as const,
      quotas,
      messageBytes: 10,
      alreadyStored: false,
      usedBytes: 0,
      entries: [] as const,
      destinationHashPresent: true
    };
    const a = stepPropagationStoreWithActions(state, event);
    const b = stepPropagationStoreWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});
