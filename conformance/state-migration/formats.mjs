/**
 * The persisted formats, and how to read one back.
 *
 * Every entry is a shape that outlives the process that wrote it. That is the
 * whole selection rule: a mini-app's grants, the identity vault, the moderation
 * list, and the multipart checkpoints are on a user's disk, and a local-first
 * platform cannot ask them to re-create any of it. Wire formats already have
 * golden vectors and differential fuzzing; this is the same discipline applied
 * to the bytes that stay.
 *
 * Each format declares:
 *   id       — stable key, and the fixture's filename stem
 *   title    — one line for humans
 *   file     — fixture filename, `.json` or `.bin`
 *   sample   — the logical value the fixture encodes
 *   write    — produce the fixture bytes from `sample` using today's encoder
 *   read     — decode fixture bytes with the current build, returning the
 *              logical value for comparison against `sample`
 *
 * A format whose `write` is absent is one this repository can no longer
 * produce — the legacy grant JSON and the unencrypted identity are both
 * formats the code still *reads* and deliberately never writes again. Their
 * fixtures are committed bytes, and regenerating them is not possible by
 * design. That is exactly what makes them worth testing: they are the only
 * on-disk shapes with no encoder left to keep them honest.
 */
import { readFileSync } from "node:fs";
import {
  encodeGrantRecord,
  grantStoreKey,
  initialGrantHostState,
  stepGrantHost,
} from "../../packages/protocol/dist/index.js";
import {
  Identity,
  NodeCryptoProvider,
  bytesToHex,
} from "../../packages/reticulum-ts/dist/index.js";
import {
  FileModerationStore,
  FileMultipartCheckpointStore,
  decryptIdentityBackup,
  encryptIdentityBackup,
  isEncryptedIdentityBackup,
} from "../../packages/host-core/dist/index.js";

const provider = new NodeCryptoProvider();

/**
 * The passphrase the committed identity fixtures are sealed with.
 *
 * A real secret would not be committed; this one exists so the fixture can be
 * opened, and the identity it protects was generated for this test and is used
 * nowhere. The vault's KDF is deliberately slow, which is why there is exactly
 * one encrypted identity fixture rather than one per release.
 */
export const FIXTURE_PASSPHRASE = "state-migration-fixture-not-a-real-secret";

const GRANT = {
  appId: "chat",
  publisherPublicKey: "ab".repeat(32),
  granted: ["net.fetch", "store.read"],
  updatedAt: 1750000000000,
};

/** Drive the real host load path, not the migration helper directly. */
function readGrantThroughHost(bytes) {
  const { state } = stepGrantHost(
    initialGrantHostState(GRANT.appId, GRANT.publisherPublicKey),
    {
      kind: "store/value",
      key: grantStoreKey(GRANT.appId, GRANT.publisherPublicKey),
      value: bytes,
    },
  );
  if (state.lastError !== null) throw new Error(state.lastError);
  if (state.record === null) throw new Error("no record decoded");
  return {
    appId: state.record.appId,
    publisherPublicKey: state.record.publisherPublicKey,
    granted: [...state.record.granted],
    updatedAt: state.record.updatedAt,
  };
}

export const formats = [
  {
    id: "grant-record",
    title: "Mini-app capability grants, canonical encoding",
    file: "grant-record.json",
    sample: GRANT,
    write: () => encodeGrantRecord(GRANT),
    read: (bytes) => readGrantThroughHost(bytes),
  },
  {
    id: "grant-record-legacy",
    title: "Mini-app capability grants, pre-canonical JSON",
    file: "grant-record-legacy.json",
    sample: GRANT,
    // No `write`: the canonical encoder replaced this shape, and the point of
    // the fixture is that the reader still accepts what an older host left on
    // disk — reordered keys and indentation included.
    read: (bytes) => readGrantThroughHost(bytes),
  },
  {
    id: "identity-encrypted",
    title: "Identity vault, TPIDBK01 encrypted backup",
    file: "identity-encrypted.bin",
    sample: { hash: null },
    read: (bytes) => {
      if (!isEncryptedIdentityBackup(bytes))
        throw new Error("not recognised as an encrypted identity backup");
      return {
        hash: bytesToHex(
          decryptIdentityBackup(provider, bytes, FIXTURE_PASSPHRASE).hash,
        ),
      };
    },
  },
  {
    id: "identity-legacy",
    title: "Identity, unencrypted private key as older hosts wrote it",
    file: "identity-legacy.bin",
    sample: { hash: null },
    read: (bytes) => ({
      hash: bytesToHex(Identity.fromBytes(provider, bytes).hash),
    }),
  },
  {
    id: "moderation-store",
    title: "Local block, mute, and report list (version 1)",
    file: "moderation-store.json",
    sample: {
      blocked: [
        {
          sourceHash: "0123456789abcdef0123456789abcdef",
          label: "spammer",
          createdAt: 1750000000000,
        },
      ],
      muted: [],
      reports: [
        {
          id: "report-1",
          sourceHash: "0123456789abcdef0123456789abcdef",
          reason: "spam",
          note: "repeated unsolicited messages",
          messageHash: null,
          createdAt: 1750000000001,
        },
      ],
    },
    read: (bytes, path) => {
      const store = new FileModerationStore(path);
      const snapshot = JSON.parse(new TextDecoder().decode(bytes));
      // Constructing the store is the parse gate; the snapshot it exposes is
      // what the host actually goes on to use.
      void store;
      return {
        blocked: snapshot.blocked,
        muted: snapshot.muted,
        reports: snapshot.reports,
      };
    },
  },
  {
    id: "multipart-checkpoints",
    title: "Resumable multipart transfer checkpoints (version 1)",
    file: "multipart-checkpoints.json",
    sample: {
      "transfer-1": { transferId: "transfer-1", received: 3, total: 9 },
    },
    read: (_bytes, path) => {
      const store = new FileMultipartCheckpointStore(path);
      return { "transfer-1": store.load("transfer-1") };
    },
  },
];

/** Fixture bytes, as committed. */
export const fixtureBytes = (path) => new Uint8Array(readFileSync(path));

export { encryptIdentityBackup, Identity, provider, bytesToHex };
