#!/usr/bin/env node
/**
 * Write the seed corpus for the three contract fuzz targets.
 *
 * Without seeds these targets never enter the code they name. Each decoder
 * opens with a five-byte magic — `TPFL\x01`, `TPLG\x01`, `TPPS\x01` — and
 * libFuzzer drawing that from random bytes is a 2^-40 event; a 20 000-run
 * session spent every input bouncing off the header check, reporting steady
 * coverage growth in the fuzz *harness* and none at all in the contract. That
 * is the same shape of failure as a fuzzer whose mutation operator could not
 * reach a byte value: plenty of activity, no reachability.
 *
 * These seeds are valid states and near-misses, written in the explicit case
 * layout `fuzz_targets/split.rs` documents, so the first execution is already
 * inside the parser and every mutation from there is a mutation of something
 * real. They are regenerated rather than hand-edited: `npm run fuzz:rust:seeds`.
 *
 * Crashes libFuzzer finds are written next to them by
 * `conformance/fuzz/rust/run.mjs`, and the whole directory is committed — a
 * counterexample found once and lost is a lottery ticket, not a regression test.
 */
import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const u16 = (value) => Uint8Array.from([(value >> 8) & 0xff, value & 0xff]);
const u32 = (value) =>
  Uint8Array.from([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
const u64 = (value) => {
  const bytes = new Uint8Array(8);
  let remaining = BigInt(value);
  for (let index = 7; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return bytes;
};
const concat = (...parts) => {
  const flat = parts.map((part) =>
    part instanceof Uint8Array ? part : Uint8Array.from(part),
  );
  const out = new Uint8Array(flat.reduce((total, p) => total + p.length, 0));
  let offset = 0;
  for (const part of flat) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};
const ascii = (text) => Uint8Array.from(text, (c) => c.charCodeAt(0));
// Each magic is four letters and a format version byte, exactly as the Rust
// constants spell it: `b"TPFL\x01"`.
const LOCATOR_MAGIC = concat(ascii("TPFL"), [0x01]);
const PACKET_LOG_MAGIC = concat(ascii("TPLG"), [0x01]);
const PROPAGATION_MAGIC = concat(ascii("TPPS"), [0x01]);
const filled = (length, byte) => new Uint8Array(length).fill(byte);

/** A case in the layout `split.rs` parses: control, left length, left, right. */
const kase = (control, left, right) =>
  concat([control], u16(left.length), left, right);

// ---------------------------------------------------------------- locator

const locatorState = (locator, archive) =>
  concat(
    LOCATOR_MAGIC,
    u16(locator.length),
    u32(archive.length),
    locator,
    archive,
  );

const LOCATOR_PARAMETER_LENGTH = 94;

const locatorSeeds = () => {
  const small = locatorState(filled(4, 0x01), filled(8, 0x02));
  const other = locatorState(filled(4, 0x03), filled(8, 0x04));
  const empty = locatorState(new Uint8Array(), new Uint8Array());
  return {
    // Two valid states that conflict: the merge has something to converge on.
    "conflict.bin": kase(LOCATOR_PARAMETER_LENGTH, small, other),
    // A valid state merged against an empty-bodied one.
    "empty-body.bin": kase(LOCATOR_PARAMETER_LENGTH, empty, small),
    // Valid states, invalid parameter length — the other half of `valid_shape`.
    "wrong-parameters.bin": kase(0, small, other),
    // Header present, declared lengths disagreeing with the body.
    "length-mismatch.bin": kase(
      LOCATOR_PARAMETER_LENGTH,
      concat(LOCATOR_MAGIC, u16(0xffff), u32(0xffffffff)),
      small,
    ),
  };
};

// -------------------------------------------------------------- packet log

const packetLogEntry = (direction, index, payload) =>
  concat([direction], u64(index), u16(payload.length), payload);

const packetLogState = (entries) =>
  concat(PACKET_LOG_MAGIC, u32(entries.length), ...entries);

const packetLogSeeds = () => {
  const inbound = packetLogState([
    packetLogEntry(0, 1, ascii("one")),
    packetLogEntry(0, 2, ascii("two")),
  ]);
  const outbound = packetLogState([packetLogEntry(1, 1, ascii("out"))]);
  const overlapping = packetLogState([
    packetLogEntry(0, 2, ascii("TWO")),
    packetLogEntry(0, 3, ascii("three")),
  ]);
  return {
    "two-directions.bin": kase(4, inbound, outbound),
    // Overlapping indices, so the entry-preference branch of the merge runs.
    "overlapping.bin": kase(4, inbound, overlapping),
    // Retention of one, with two entries in a direction: the eviction path.
    "retention-one.bin": kase(1, inbound, overlapping),
    // A count field that promises far more entries than the buffer holds.
    "count-overrun.bin": kase(
      4,
      concat(PACKET_LOG_MAGIC, u32(0xffffffff)),
      inbound,
    ),
    "empty-log.bin": kase(4, packetLogState([]), inbound),
  };
};

// ---------------------------------------------------------- propagation set

const propagationEntry = (transientByte, storedAt, payload) =>
  concat(
    filled(32, transientByte),
    u64(storedAt),
    u32(payload.length),
    payload,
  );

const propagationState = (entries) =>
  concat(PROPAGATION_MAGIC, u32(entries.length), ...entries);

const propagationSeeds = () => {
  const left = propagationState([
    propagationEntry(0x11, 1000, ascii("alpha")),
    propagationEntry(0x22, 2000, ascii("beta")),
  ]);
  const right = propagationState([
    propagationEntry(0x22, 3000, ascii("BETA")),
    propagationEntry(0x33, 4000, ascii("gamma")),
  ]);
  return {
    // Sets overlapping on one transient id: the preference rule runs.
    "overlapping.bin": kase(0, left, right),
    "disjoint.bin": kase(0, left, propagationState([])),
    "count-overrun.bin": kase(
      0,
      concat(PROPAGATION_MAGIC, u32(0xffffffff)),
      left,
    ),
    // A declared message length larger than the remaining buffer.
    "payload-overrun.bin": kase(
      0,
      concat(
        PROPAGATION_MAGIC,
        u32(1),
        filled(32, 0x44),
        u64(1),
        u32(0xffffffff),
      ),
      left,
    ),
  };
};

const CORPORA = {
  locator: locatorSeeds(),
  "packet-log": packetLogSeeds(),
  "propagation-set": propagationSeeds(),
};

/**
 * Seeds are named `seed-*.bin` and rewritten on every run; anything else in the
 * corpus is a committed counterexample and is left exactly where it is.
 */
for (const [target, seeds] of Object.entries(CORPORA)) {
  const directory = join(here, "corpus", target);
  mkdirSync(directory, { recursive: true });
  for (const existing of readdirSync(directory)) {
    if (existing.startsWith("seed-")) rmSync(join(directory, existing));
  }
  for (const [name, bytes] of Object.entries(seeds)) {
    writeFileSync(join(directory, `seed-${name}`), bytes);
  }
  console.log(`${target}: ${Object.keys(seeds).length} seed(s)`);
}
