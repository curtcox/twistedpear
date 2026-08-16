#!/usr/bin/env node
/**
 * Write the committed store fixtures. Run by hand, never by a gate.
 *
 * This exists to create a fixture the *first* time a format is covered, and to
 * add one when a new persisted format appears. It deliberately refuses to
 * overwrite a fixture that already exists: a fixture regenerated from today's
 * encoder is today's format, and a "migration test" whose inputs are rewritten
 * whenever they stop matching is a test of nothing at all. Delete the file
 * consciously if a format genuinely has to be re-cut.
 *
 * The two legacy fixtures have no encoder — the canonical grant encoder
 * replaced one and the identity vault replaced the other — so they are written
 * here from a hand-built byte sequence in the shape an older host left behind,
 * and never again.
 *
 * Usage: node conformance/state-migration/record.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FIXTURE_PASSPHRASE,
  Identity,
  bytesToHex,
  encryptIdentityBackup,
  formats,
  provider,
} from "./formats.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "fixtures");
mkdirSync(FIXTURES, { recursive: true });

const encoder = new TextEncoder();
const json = (value) => encoder.encode(`${JSON.stringify(value, null, 2)}\n`);

/** One identity, stored twice: sealed by the vault and raw as hosts once did. */
const identity = new Identity(provider);

/**
 * Bytes for each format, including the two with no encoder left.
 *
 * The legacy grant fixture is deliberately not `JSON.stringify` of the record
 * in field order: an older host wrote whatever order its object literal had,
 * with indentation, and accepting that is the entire behaviour under test.
 */
const bytesFor = {
  "grant-record-legacy": () =>
    json({
      updatedAt: 1750000000000,
      granted: ["net.fetch", "store.read"],
      publisherPublicKey: "ab".repeat(32),
      appId: "chat",
    }),
  "identity-encrypted": () =>
    encryptIdentityBackup(provider, identity, FIXTURE_PASSPHRASE),
  "identity-legacy": () => identity.getPrivateKey(),
  // The file stores keep their logical contents inside a `version` envelope,
  // and the envelope is the part under test: both constructors reject a file
  // whose version is not 1, which is how a future format change announces
  // itself instead of silently misreading an old file.
  "moderation-store": (format) => json({ version: 1, ...format.sample }),
  "multipart-checkpoints": (format) =>
    json({ version: 1, transfers: format.sample }),
};

const written = [];
const kept = [];

for (const format of formats) {
  const file = path.join(FIXTURES, format.file);
  if (existsSync(file)) {
    kept.push(format.id);
    continue;
  }
  const produce = bytesFor[format.id];
  const bytes = produce
    ? produce(format)
    : format.write
      ? format.write()
      : json(format.sample);
  writeFileSync(file, bytes);
  written.push(format.id);
}

console.log(
  `state-migration: wrote ${written.length} fixture(s)${written.length > 0 ? ` (${written.join(", ")})` : ""}, kept ${kept.length} existing.`,
);
if (
  written.includes("identity-encrypted") ||
  written.includes("identity-legacy")
)
  console.log(`  identity hash: ${bytesToHex(identity.hash)}`);
console.log(
  "Now run `node conformance/state-migration/run.mjs --write` to record what the current build reads back.",
);
