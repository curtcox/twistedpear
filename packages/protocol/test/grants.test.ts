import { describe, expect, it } from "vitest";
import {
  assertReplayDeterminism,
  hashNodeStates,
} from "../../effects/src/adapters/sim/replay.js";
import { SimKernel } from "../../effects/src/adapters/sim/kernel.js";
import type { Event } from "@twistedpear/effects";
import {
  InvalidGrantRecordError,
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
  type GrantRecord,
} from "../src/grants.js";
import { utf8Encode } from "../src/utf8.js";
import { grantRecordMutationCorpus } from "../../sim-adversaries/src/grant-mutations.js";

const APP = "demo-app";
const PUBKEY = "publisher-pk-hex";

function grantSet(
  at: number,
  declared: string[],
  requested: string[],
  ttlMs = 10,
): Event {
  return {
    kind: "grant/set",
    at,
    declared,
    requested,
    ttlMs,
  } as unknown as Event;
}

function grantRevoke(at: number, capability: string): Event {
  return { kind: "grant/revoke", at, capability } as unknown as Event;
}

describe("protocol grant host", () => {
  it("uses the shipping lifecycle table for all seven legal edges", () => {
    const approve = (ttlMs = 10) =>
      stepGrantHost(initialGrantHostState(APP, PUBKEY), {
        kind: "grant/set",
        at: 1,
        declared: ["read"],
        requested: ["read"],
        ttlMs,
      }).state;
    expect(approve().lifecycles?.read?.phase).toBe("granted");
    const denied = stepGrantHost(initialGrantHostState(APP, PUBKEY), {
      kind: "grant/deny",
      at: 1,
      capability: "read",
    }).state;
    expect(denied.lifecycles?.read?.phase).toBe("denied");

    const granted = approve();
    const active = stepGrantHost(granted, {
      kind: "grant/first-use",
      at: 2,
      capability: "read",
    }).state;
    expect(active.lifecycles?.read?.phase).toBe("active");
    expect(
      stepGrantHost(approve(), {
        kind: "grant/ttl",
        at: 11,
        capability: "read",
      }).state.lifecycles?.read?.phase,
    ).toBe("expired");
    expect(
      stepGrantHost(active, { kind: "grant/ttl", at: 11, capability: "read" })
        .state.lifecycles?.read?.phase,
    ).toBe("expired");
    expect(
      stepGrantHost(approve(), {
        kind: "grant/revoke",
        at: 3,
        capability: "read",
      }).state.lifecycles?.read?.phase,
    ).toBe("revoked");
    expect(
      stepGrantHost(active, { kind: "grant/revoke", at: 3, capability: "read" })
        .state.lifecycles?.read?.phase,
    ).toBe("revoked");
  });

  it("rejects illegal lifecycle edges through the same production step", () => {
    const granted = stepGrantHost(initialGrantHostState(APP, PUBKEY), {
      kind: "grant/set",
      at: 1,
      declared: ["read"],
      requested: ["read"],
      ttlMs: 10,
    }).state;
    const active = stepGrantHost(granted, {
      kind: "grant/first-use",
      at: 2,
      capability: "read",
    }).state;
    const revoked = stepGrantHost(active, {
      kind: "grant/revoke",
      at: 3,
      capability: "read",
    }).state;
    const expired = stepGrantHost(granted, {
      kind: "grant/ttl",
      at: 11,
      capability: "read",
    }).state;
    const denied = stepGrantHost(initialGrantHostState(APP, PUBKEY), {
      kind: "grant/deny",
      at: 1,
      capability: "read",
    }).state;
    for (const terminal of [revoked, expired, denied]) {
      expect(
        stepGrantHost(terminal, {
          kind: "grant/set",
          at: 20,
          declared: ["read"],
          requested: ["read"],
          ttlMs: 10,
        }).state,
      ).toBe(terminal);
      expect(
        stepGrantHost(terminal, {
          kind: "grant/first-use",
          at: 20,
          capability: "read",
        }).state,
      ).toBe(terminal);
      expect(
        stepGrantHost(terminal, {
          kind: "grant/revoke",
          at: 20,
          capability: "read",
        }).state,
      ).toBe(terminal);
    }
    expect(
      stepGrantHost(granted, { kind: "grant/ttl", at: 5, capability: "read" })
        .state,
    ).toBe(granted);
    expect(
      stepGrantHost(active, {
        kind: "grant/first-use",
        at: 4,
        capability: "read",
      }).state,
    ).toBe(active);
  });

  it("round-trips grant records", () => {
    const record: GrantRecord = {
      appId: APP,
      publisherPublicKey: PUBKEY,
      granted: ["read", "write"],
      updatedAt: 42,
    };
    expect(decodeGrantRecord(encodeGrantRecord(record))).toEqual(record);
    expect([
      ...encodeGrantRecord(decodeGrantRecord(encodeGrantRecord(record))),
    ]).toEqual([...encodeGrantRecord(record)]);
  });

  it("rejects every non-canonical near miss", () => {
    const canonical = encodeGrantRecord({
      appId: APP,
      publisherPublicKey: PUBKEY,
      granted: ["read", "write"],
      updatedAt: 42,
    });
    for (const mutation of grantRecordMutationCorpus(canonical)) {
      expect(() => decodeGrantRecord(mutation)).toThrow();
    }
    for (const text of [
      '{"publisherPublicKey":"publisher-pk-hex","appId":"demo-app","granted":[],"updatedAt":42}',
      '{"appId":"demo-app","publisherPublicKey":"publisher-pk-hex","granted":["read","read"],"updatedAt":42}',
      '{"appId":"demo-app","publisherPublicKey":"publisher-pk-hex","granted":[],"updatedAt":4e1}',
      '{"appId":"demo-app","publisherPublicKey":"publisher-pk-hex","granted":[],"updatedAt":-0}',
    ])
      expect(() => decodeGrantRecord(utf8Encode(text))).toThrow();
  });

  it("rewrites a valid legacy record canonically on first host read", () => {
    const key = grantStoreKey(APP, PUBKEY);
    const legacy = utf8Encode(
      '{ "appId": "demo-app", "publisherPublicKey": "publisher-pk-hex", "granted": ["read"], "updatedAt": 42 }',
    );
    const result = stepGrantHost(initialGrantHostState(APP, PUBKEY), {
      kind: "store/value",
      key,
      value: legacy,
    });
    expect(result.state.record?.granted).toEqual(["read"]);
    expect(result.intents).toHaveLength(1);
    const write = result.intents[0];
    expect(write?.kind).toBe("store/write");
    if (write?.kind === "store/write")
      expect(decodeGrantRecord(write.write.value).updatedAt).toBe(42);
  });
});

describe("protocol grant host (continued)", () => {
  it("does not migrate ambiguous legacy duplicate keys", () => {
    for (const duplicate of [
      '{"appId":"wrong","appId":"demo-app","publisherPublicKey":"publisher-pk-hex","granted":[],"updatedAt":42}',
      '{"appId":"wrong","\\u0061ppId":"demo-app","publisherPublicKey":"publisher-pk-hex","granted":[],"updatedAt":42}',
    ]) {
      const result = stepGrantHost(initialGrantHostState(APP, PUBKEY), {
        kind: "store/value",
        key: grantStoreKey(APP, PUBKEY),
        value: utf8Encode(duplicate),
      });
      expect(result.state.record).toBeNull();
      expect(result.state.lastError).toBe("grant record decode failed");
      expect(result.intents).toEqual([]);
    }
  });

  it("emits encode/decode actions from WithActions steps", () => {
    const record: GrantRecord = {
      appId: APP,
      publisherPublicKey: PUBKEY,
      granted: ["read", "write"],
      updatedAt: 42,
    };
    const encoded = encodeGrantRecord(record);

    const encodeOk = stepEncodeGrantRecordWithActions(
      initialEncodeGrantRecordState(),
      {
        kind: "grant/encode-gate",
        record,
      },
    );
    expect(shouldUseEncodeGrantRecord(encodeOk.actions)).toBe(true);
    expect(shouldRejectEncodeGrantRecord(encodeOk.actions)).toBe(false);
    expect([...encodeGrantRecordRawFromActions(encodeOk.actions)!]).toEqual([
      ...encoded,
    ]);

    const decodeOk = stepDecodeGrantRecordWithActions(
      initialDecodeGrantRecordState(),
      {
        kind: "grant/decode-gate",
        bytes: encoded,
      },
    );
    expect(shouldUseDecodeGrantRecord(decodeOk.actions)).toBe(true);
    expect(grantRecordFromActions(decodeOk.actions)).toEqual(record);

    const decodeReject = stepDecodeGrantRecordWithActions(
      initialDecodeGrantRecordState(),
      {
        kind: "grant/decode-gate",
        bytes: utf8Encode("not-json"),
      },
    );
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
          step: stepGrantHost,
        },
      ],
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
          step: stepGrantHost,
        },
      ],
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
          step: stepGrantHost,
        },
      ],
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
          step: stepGrantHost,
        },
      ],
    };
    const { liveHash, replayHash, stateHash } = assertReplayDeterminism(
      config,
      (kernel) => {
        kernel.start();
        kernel.inject("host", grantSet(50, ["read", "write"], ["read"]));
        kernel.inject("host", grantRevoke(60, "read"));
      },
    );
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
          step: stepGrantHost,
        },
      ],
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

describe("grant record field validation", () => {
  const valid: GrantRecord = {
    appId: APP,
    publisherPublicKey: PUBKEY,
    granted: ["read"],
    updatedAt: 1,
  };

  it("rejects duplicate capabilities, negative clocks, and incomplete JSON", () => {
    expect(() =>
      encodeGrantRecord({ ...valid, granted: ["read", "read"] }),
    ).toThrow(InvalidGrantRecordError);
    expect(() => encodeGrantRecord({ ...valid, updatedAt: -1 })).toThrow(
      InvalidGrantRecordError,
    );
    expect(() => decodeGrantRecord(utf8Encode("{"))).toThrow(
      InvalidGrantRecordError,
    );
    expect(() => decodeGrantRecord(utf8Encode('{"appId":"demo-app"}'))).toThrow(
      InvalidGrantRecordError,
    );
  });
});
