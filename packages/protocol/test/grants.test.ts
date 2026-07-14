import { describe, expect, it } from "vitest";
import {
  assertReplayDeterminism,
  hashNodeStates
} from "../../effects/src/adapters/sim/replay.js";
import { SimKernel } from "../../effects/src/adapters/sim/kernel.js";
import type { Event } from "@twistedpear/effects";
import {
  decodeGrantRecord,
  encodeGrantRecord,
  encodeGrantRecordRawFromActions,
  grantRecordFromActions,
  grantStoreKey,
  initialDecodeGrantRecordState,
  initialEncodeGrantRecordState,
  initialGrantHostState,
  shouldRejectDecodeGrantRecord,
  shouldRejectEncodeGrantRecord,
  shouldUseDecodeGrantRecord,
  shouldUseEncodeGrantRecord,
  stepDecodeGrantRecordWithActions,
  stepEncodeGrantRecordWithActions,
  stepGrantHost,
  type GrantRecord
} from "../src/grants.js";
import { utf8Encode } from "../src/utf8.js";

const APP = "demo-app";
const PUBKEY = "publisher-pk-hex";

function grantSet(at: number, declared: string[], requested: string[]): Event {
  return { kind: "grant/set", at, declared, requested } as unknown as Event;
}

function grantRevoke(at: number, capability: string): Event {
  return { kind: "grant/revoke", at, capability } as unknown as Event;
}

describe("protocol grant host", () => {
  it("round-trips grant records", () => {
    const record: GrantRecord = {
      appId: APP,
      publisherPublicKey: PUBKEY,
      granted: ["read", "write"],
      updatedAt: 42
    };
    expect(decodeGrantRecord(encodeGrantRecord(record))).toEqual(record);
  });

  it("emits encode/decode actions from WithActions steps", () => {
    const record: GrantRecord = {
      appId: APP,
      publisherPublicKey: PUBKEY,
      granted: ["read", "write"],
      updatedAt: 42
    };
    const encoded = encodeGrantRecord(record);

    const encodeOk = stepEncodeGrantRecordWithActions(initialEncodeGrantRecordState(), {
      kind: "grant/encode-gate",
      record
    });
    expect(shouldUseEncodeGrantRecord(encodeOk.actions)).toBe(true);
    expect(shouldRejectEncodeGrantRecord(encodeOk.actions)).toBe(false);
    expect([...encodeGrantRecordRawFromActions(encodeOk.actions)!]).toEqual([...encoded]);

    const decodeOk = stepDecodeGrantRecordWithActions(initialDecodeGrantRecordState(), {
      kind: "grant/decode-gate",
      bytes: encoded
    });
    expect(shouldUseDecodeGrantRecord(decodeOk.actions)).toBe(true);
    expect(grantRecordFromActions(decodeOk.actions)).toEqual(record);

    const decodeReject = stepDecodeGrantRecordWithActions(initialDecodeGrantRecordState(), {
      kind: "grant/decode-gate",
      bytes: utf8Encode("not-json")
    });
    expect(shouldRejectDecodeGrantRecord(decodeReject.actions)).toBe(true);
    expect(grantRecordFromActions(decodeReject.actions)).toBeNull();
  });

  it("persists grants via store intents", () => {
    const config = {
      seed: 13,
      nodes: [
        {
          id: "host",
          initial: initialGrantHostState(APP, PUBKEY),
          step: stepGrantHost
        }
      ]
    };
    const kernel = new SimKernel(config);
    kernel.start();
    kernel.inject("host", grantSet(100, ["read", "write"], ["read"]));
    const state = kernel.getNodeState("host");
    expect(state.lastError).toBeNull();
    expect(state.record?.granted).toEqual(["read"]);
    expect(state.record?.updatedAt).toBe(100);
    expect(grantStoreKey(APP, PUBKEY)).toBe(`miniapp-grants:${PUBKEY}:${APP}`);
  });

  it("rejects undeclared capabilities", () => {
    const kernel = new SimKernel({
      seed: 1,
      nodes: [
        {
          id: "host",
          initial: initialGrantHostState(APP, PUBKEY),
          step: stepGrantHost
        }
      ]
    });
    kernel.inject("host", grantSet(0, ["read"], ["admin"]));
    const state = kernel.getNodeState("host");
    expect(state.record).toBeNull();
    expect(state.lastError).toContain("undeclared capability");
  });

  it("revokes a single capability", () => {
    const kernel = new SimKernel({
      seed: 2,
      nodes: [
        {
          id: "host",
          initial: initialGrantHostState(APP, PUBKEY),
          step: stepGrantHost
        }
      ]
    });
    kernel.inject("host", grantSet(10, ["read", "write"], ["read", "write"]));
    kernel.inject("host", grantRevoke(20, "read"));
    const state = kernel.getNodeState("host");
    expect(state.record?.granted).toEqual(["write"]);
    expect(state.record?.updatedAt).toBe(20);
  });

  it("replays identically from recorded events", () => {
    const config = {
      seed: 77,
      nodes: [
        {
          id: "host",
          initial: initialGrantHostState(APP, PUBKEY),
          step: stepGrantHost
        }
      ]
    };
    const { liveHash, replayHash, stateHash } = assertReplayDeterminism(config, (kernel) => {
      kernel.start();
      kernel.inject("host", grantSet(50, ["read", "write"], ["read"]));
      kernel.inject("host", grantRevoke(60, "read"));
    });
    expect(liveHash).toBeTruthy();
    expect(replayHash).toBeTruthy();
    expect(stateHash).toBeTruthy();
  });

  it("double-runs produce identical state hashes", () => {
    const config = {
      seed: 88,
      nodes: [
        {
          id: "host",
          initial: initialGrantHostState(APP, PUBKEY),
          step: stepGrantHost
        }
      ]
    };
    const run = () => {
      const kernel = new SimKernel(config);
      kernel.start();
      kernel.inject("host", grantSet(1, ["a", "b"], ["a", "b", "a"]));
      return hashNodeStates(new Map([["host", kernel.getNodeState("host")]]));
    };
    expect(run()).toBe(run());
  });
});
