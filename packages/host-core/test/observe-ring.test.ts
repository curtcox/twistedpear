import { describe, expect, it } from "vitest";
import {
  createObserveRing,
  ringToRecordedHistory,
} from "../src/observe-ring.js";

describe("observe ring", () => {
  it("bounds capacity and snapshots SPEC-EVENTS intents", () => {
    const ring = createObserveRing(2);
    ring.push({
      kind: "observe/drop",
      stage: "ingress-dispatch",
      reason: "ignored",
    });
    ring.push({
      kind: "observe/drop",
      stage: "announce-rate-limit",
      reason: "rate_limited",
      destinationKey: "aabb",
    });
    ring.push({
      kind: "observe/drop",
      stage: "announce-local-echo",
      reason: "local_echo",
    });
    expect(ring.size()).toBe(2);
    const snap = ring.snapshot();
    expect(snap[0]?.intent).toEqual(
      expect.objectContaining({
        stage: "announce-rate-limit",
        reason: "rate_limited",
      }),
    );
    expect(snap[1]?.intent).toEqual(
      expect.objectContaining({
        stage: "announce-local-echo",
        reason: "local_echo",
      }),
    );
    const history = ringToRecordedHistory(snap, "hub");
    expect(history.schema).toBe("recorded-history");
    expect(history.entries).toHaveLength(2);
    expect(history.entries[0]?.node).toBe("hub");
  });

  it("notifies subscribers of new entries", () => {
    const ring = createObserveRing(8);
    const seen: string[] = [];
    const unsubscribe = ring.subscribe((entry) => {
      if (entry.intent.kind === "observe/drop") {
        seen.push(entry.intent.reason);
      }
    });
    ring.push({
      kind: "observe/drop",
      stage: "path-entry",
      reason: "path_not_added",
    });
    expect(seen).toEqual(["path_not_added"]);
    unsubscribe();
    ring.push({
      kind: "observe/drop",
      stage: "ingress-dispatch",
      reason: "ignored",
    });
    expect(seen).toEqual(["path_not_added"]);
  });
});
