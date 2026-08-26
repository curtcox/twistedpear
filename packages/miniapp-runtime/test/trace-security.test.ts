import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  MiniappBroker,
  type BrokerAuditEntry,
  type BrokerContext,
} from "../src/broker.js";
import {
  APP_TRACE_SHAPE_FORBIDDEN_KEYS,
  parseAppTrace,
  serializeAppTrace,
} from "../src/trace-format.js";
import {
  hashPayloadAppTrace,
  parsePayloadAppTrace,
  redactAppTrace,
  serializePayloadAppTrace,
} from "../src/trace-payload.js";
import { SessionRecorder } from "../src/trace-recording.js";
import {
  openSealedAppTrace,
  sealAppTrace,
  type TraceEntropy,
} from "../src/trace-seal.js";

const here = dirname(fileURLToPath(import.meta.url));
const vectorsPath = join(
  here,
  "..",
  "..",
  "..",
  "specs",
  "spec-app-trace",
  "vectors",
  "app-session-payload.json",
);

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

const SECRET = "correct-horse-battery-staple-trace-secret";

function recorder(
  mode: "shape" | "payload" = "shape",
  maxBytes?: number,
): SessionRecorder {
  return new SessionRecorder({
    identity: IDENTITY,
    host: HOST,
    grants: ["lxmf:send"],
    now: () => 0,
    mode,
    ...(maxBytes === undefined ? {} : { maxBytes }),
  });
}

function entropy(seed = 7): TraceEntropy {
  let n = seed;
  return {
    randomBytes(size) {
      const out = new Uint8Array(size);
      for (let i = 0; i < size; i += 1) {
        n = (n * 1103515245 + 12345) >>> 0;
        out[i] = n & 0xff;
      }
      return out;
    },
  };
}

function x25519Pair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const pair = generateKeyPairSync("x25519");
  const priv = pair.privateKey.export({ type: "pkcs8", format: "der" });
  const pub = pair.publicKey.export({ type: "spki", format: "der" });
  return {
    privateKey: new Uint8Array(priv.subarray(priv.length - 32)),
    publicKey: new Uint8Array(pub.subarray(pub.length - 32)),
  };
}

function containsUtf8(haystack: string, needle: string): boolean {
  return haystack.includes(needle);
}

describe("TRACE-4 payload, redaction, and sealed traces", () => {
  it("keeps snapshot() shape-only even when payload recording is on", async () => {
    const session = recorder("payload");
    session.noteClockShim(true);
    session.recordClock(0);

    const audit: BrokerAuditEntry[] = [];
    const broker = new MiniappBroker({
      now: () => 1,
      audit: (entry) => {
        audit.push(entry);
        session.recordBrokerAudit({
          ...entry,
          payload: SECRET,
        } as BrokerAuditEntry & { payload: string });
      },
    });
    broker.register("lxmf", "send", "lxmf:send", (request) => request.payload);
    const result = await broker.dispatch(
      {
        id: "1",
        namespace: "lxmf",
        method: "send",
        payload: { note: SECRET },
      },
      CONTEXT,
    );
    expect(result.ok).toBe(true);
    expect(audit[0]?.outcome).toBe("allowed");

    session.recordBroker({
      namespace: "lxmf",
      method: "send",
      capability: "lxmf:send",
      outcome: "allowed",
      at: 1,
      payload: { note: SECRET },
      result: { ok: true },
    });

    const shape = session.snapshot();
    expect(shape.mode).toBe("shape");
    const serialized = serializeAppTrace(shape);
    for (const key of APP_TRACE_SHAPE_FORBIDDEN_KEYS) {
      expect(serialized.includes(`"${key}"`)).toBe(false);
    }
    expect(containsUtf8(serialized, SECRET)).toBe(false);
    expect(() => parseAppTrace(JSON.parse(serialized))).not.toThrow();
  });

  it("records payloads only when enabled, and redaction strips them byte-wise", () => {
    const session = recorder("payload");
    session.noteClockShim(true);
    session.recordClock(0);
    session.recordBroker({
      namespace: "lxmf",
      method: "send",
      capability: "lxmf:send",
      outcome: "allowed",
      payload: { note: SECRET, body: "classified" },
      result: { delivered: true },
    });

    const payload = session.snapshotPayload();
    expect(payload.mode).toBe("payload");
    const raw = serializePayloadAppTrace(payload);
    expect(containsUtf8(raw, SECRET)).toBe(true);

    const redacted = redactAppTrace(payload);
    expect(redacted.mode).toBe("shape");
    const redactedText = serializeAppTrace(redacted);
    expect(containsUtf8(redactedText, SECRET)).toBe(false);
    expect(containsUtf8(redactedText, "classified")).toBe(false);
    expect(session.redact()).toEqual(redacted);
    expect(() => parseAppTrace(payload)).toThrow(/shape-only|mode/);
  });

  it("seals a payload trace to an X25519 key and refuses the wrong key", () => {
    const session = recorder("payload");
    session.noteClockShim(true);
    session.recordClock(0);
    session.recordBroker({
      namespace: "lxmf",
      method: "send",
      capability: "lxmf:send",
      outcome: "allowed",
      payload: { note: SECRET },
    });
    const payload = session.snapshotPayload();
    const recipient = x25519Pair();
    const stranger = x25519Pair();
    const sealed = sealAppTrace(payload, recipient.publicKey, entropy());
    const encoded = JSON.stringify(sealed);
    expect(containsUtf8(encoded, SECRET)).toBe(false);
    expect(sealed.mode).toBe("sealed");
    expect(sealed.ct).not.toContain(
      Buffer.from(SECRET, "utf8").toString("hex"),
    );

    const opened = openSealedAppTrace(sealed, recipient.privateKey);
    expect(opened.mode).toBe("payload");
    expect(serializePayloadAppTrace(opened as typeof payload)).toBe(
      serializePayloadAppTrace(payload),
    );
    expect(() => openSealedAppTrace(sealed, stranger.privateKey)).toThrow(
      /recipient key mismatch|authentication failed/,
    );
  });

  it("isolates recorders per host object and hides them from the broker", () => {
    const a = recorder();
    const b = recorder();
    a.noteClockShim(true);
    b.noteClockShim(true);
    a.recordClock(0);
    a.recordInbound("ui", "press", 1);
    b.recordClock(0);
    expect(a.snapshot().entries).toHaveLength(2);
    expect(b.snapshot().entries).toHaveLength(1);
    expect(Object.getOwnPropertyNames(MiniappBroker.prototype)).not.toContain(
      "snapshot",
    );
    expect(Object.getOwnPropertyNames(MiniappBroker.prototype)).not.toEqual(
      expect.arrayContaining(["recordClock", "snapshotPayload"]),
    );
  });

  it("drops oldest tape when the byte budget is exceeded", () => {
    const session = recorder("payload", 180);
    session.noteClockShim(true);
    session.recordClock(0);
    for (let i = 0; i < 8; i += 1) {
      session.recordBroker({
        namespace: "lxmf",
        method: "send",
        capability: "lxmf:send",
        outcome: "allowed",
        payload: { note: `${SECRET}-${i}`, blob: "x".repeat(40) },
      });
    }
    expect(session.droppedCount).toBeGreaterThan(0);
    const snap = session.snapshot();
    expect(snap.entries.length).toBeGreaterThan(0);
    expect(serializeAppTrace(snap).length).toBeLessThan(2000);
  });

  it("round-trips the Cookbook payload vector", () => {
    const file = JSON.parse(readFileSync(vectorsPath, "utf8")) as {
      vectors: ReadonlyArray<{ name: string; hash: string; trace: unknown }>;
    };
    const vector = file.vectors[0];
    if (vector === undefined) throw new Error("missing payload vector");
    const parsed = parsePayloadAppTrace(vector.trace);
    expect(hashPayloadAppTrace(parsed)).toBe(vector.hash);
    expect(
      containsUtf8(serializeAppTrace(redactAppTrace(parsed)), "secret-note"),
    ).toBe(false);
  });
});
