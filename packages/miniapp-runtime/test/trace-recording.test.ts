import { describe, expect, it } from "vitest";
import {
  MiniappBroker,
  type BrokerAuditEntry,
  type BrokerContext,
} from "../src/broker.js";
import {
  APP_TRACE_SHAPE_FORBIDDEN_KEYS,
  hashAppTrace,
  parseAppTrace,
  serializeAppTrace,
} from "../src/trace-format.js";
import {
  SessionRecorder,
  UnshimmedClockError,
  countWidgetNodes,
} from "../src/trace-recording.js";
import { installTimeShims, isNativeDateNow } from "../src/time-shims.js";

const IDENTITY = {
  appId: "dice-table",
  version: "1.0.0",
  publisherKey: "11".repeat(32),
  packageHash: "aa".repeat(32),
} as const;

const HOST = {
  platform: "node",
  hostVersion: "0.0.0",
  hostApiVersion: "0.20.0",
} as const;

const CONTEXT: BrokerContext = {
  appId: "dice-table",
  publisherPublicKey: "publisher",
  declaredCapabilities: ["lxmf:send"],
  grantedCapabilities: ["lxmf:send"],
};

function recorder(now = (): number => 0): SessionRecorder {
  return new SessionRecorder({
    identity: IDENTITY,
    host: HOST,
    grants: ["lxmf:send"],
    now,
  });
}

describe("TRACE-2 session recording", () => {
  it("records a shape-only broker session without payloads", async () => {
    const session = recorder();
    session.noteClockShim(true);
    session.recordClock(0);

    const audit: BrokerAuditEntry[] = [];
    const broker = new MiniappBroker({
      now: () => 1,
      audit: (entry) => {
        audit.push(entry);
        session.recordBrokerAudit(entry);
      },
    });
    broker.register("lxmf", "send", "lxmf:send", (request) => request.payload);

    const result = await broker.dispatch(
      {
        id: "1",
        namespace: "lxmf",
        method: "send",
        payload: { key: "secret-note", value: "classified" },
      },
      CONTEXT,
    );
    expect(result.ok).toBe(true);
    expect(audit[0]?.outcome).toBe("allowed");

    session.recordInbound("ui", "press", 2);
    session.recordAssertWidget(3, 3);

    const trace = session.snapshot();
    expect(trace.mode).toBe("shape");
    expect(trace.entries.map((entry) => entry.t)).toEqual([
      "clock",
      "broker",
      "inbound",
      "assert",
    ]);
    const brokerEntry = trace.entries.find((entry) => entry.t === "broker");
    expect(brokerEntry).toMatchObject({
      t: "broker",
      namespace: "lxmf",
      method: "send",
      capability: "lxmf:send",
      outcome: "allowed",
    });
    expect(brokerEntry).not.toHaveProperty("payload");
    expect(brokerEntry).not.toHaveProperty("result");

    const serialized = serializeAppTrace(trace);
    for (const key of APP_TRACE_SHAPE_FORBIDDEN_KEYS) {
      expect(serialized.includes(`"${key}"`)).toBe(false);
    }
    expect(serialized).not.toContain("secret-note");
    expect(serialized).not.toContain("classified");
    expect(parseAppTrace(JSON.parse(serialized))).toEqual(trace);
    expect(hashAppTrace(trace)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("records clock and entropy through the time shims", () => {
    const session = recorder(() => 10);
    const entropy = new Uint8Array(32);
    for (let i = 0; i < entropy.length; i++) entropy[i] = i + 1;
    let offset = 0;
    const target = {
      Date: { now: () => 999_999 },
      Math: { random: () => 0.123 },
      crypto: {
        getRandomValues: <T extends ArrayBufferView>(array: T): T => array,
      },
    };
    const shims = installTimeShims(target, {
      now: () => 10,
      randomBytes: (n) => {
        const slice = entropy.subarray(offset, offset + n);
        offset += n;
        return new Uint8Array(slice);
      },
      recordClock: () => session.recordClock(),
      recordEntropy: (byteCount) => session.recordEntropy(byteCount),
    });
    session.noteClockShim(true);
    expect(isNativeDateNow(target)).toBe(false);
    expect(target.Date.now()).toBe(10);
    expect(target.Math.random()).toBeGreaterThanOrEqual(0);
    const buffer = new Uint8Array(4);
    target.crypto.getRandomValues(buffer);
    expect([...buffer]).toEqual([9, 10, 11, 12]);
    shims.restore();

    const kinds = session.snapshot().entries.map((entry) => entry.t);
    expect(kinds).toContain("clock");
    expect(kinds.filter((kind) => kind === "entropy")).toHaveLength(2);
  });

  it("fails closed when the clock shim is missing", () => {
    const session = recorder();
    session.recordClock(0);
    session.noteClockShim(false);
    expect(() => session.snapshot()).toThrow(UnshimmedClockError);
  });

  it("treats an unshimmed Date.now as native", () => {
    expect(isNativeDateNow({ Date, Math })).toBe(true);
    const session = recorder();
    session.noteClockShim(isNativeDateNow({ Date, Math }) === false);
    expect(() => session.snapshot()).toThrow(/clock shim/);
  });

  it("counts widget nodes for assert entries", () => {
    expect(
      countWidgetNodes({
        root: {
          children: [{ children: [{}, {}] }, {}],
        },
      }),
    ).toBe(5);
  });
});
