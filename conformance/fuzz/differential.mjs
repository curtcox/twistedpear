/**
 * Differential fuzzing against the pinned Python reference: the pure half.
 *
 * The mutation engine and the committed corpus gave the fuzzers reproducible
 * inputs, but no oracle. All they could assert was that our decoders do not
 * throw — which a decoder that returns `null` for every byte string on earth
 * satisfies perfectly. "Does not crash" is not "is correct".
 *
 * The oracle is the implementation this project exists to be compatible with:
 * `rns==0.9.5` and `lxmf==0.7.0`, already pinned in `conformance/docker`. Feed
 * the same structured-random bytes to both, canonicalise both answers into the
 * same string grammar, and compare. A disagreement is a finding whichever way
 * it points:
 *
 *   - we accept what the reference rejects — we will parse a frame the rest of
 *     the network drops, which is the direction that carries security weight;
 *   - the reference accepts what we reject — we will drop a frame every real
 *     peer honours, which is an interoperability bug;
 *   - both accept and the fields differ — the worst of the three, because
 *     nothing anywhere reports it.
 *
 * Everything here is pure: no Docker, no `dist/`, no filesystem beyond the
 * allowance file. `conformance/checks/differential-fuzz.test.mjs` tests it
 * directly, so the comparison logic is checked on machines that cannot run the
 * reference at all — the same split as `conformance/checks/android-retry.test.mjs`.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { bytesToHex, createRandom, hexToBytes, mutate } from "./engine.mjs";

export { hexToBytes };

const ALLOWANCE_PATH = resolve(
  "conformance/vectors/differential-allowances.json",
);

export function allowancePath() {
  return ALLOWANCE_PATH;
}

/**
 * The surfaces where our decoders claim to mirror the reference, with the seeds
 * the mutation engine starts from.
 *
 * Seeds matter more here than in a crash fuzzer. Random bytes are rejected by
 * both sides almost always, and two implementations that agree on "no" tell you
 * nothing. Each seed below is a frame the reference itself produced or accepts,
 * so a mutation lands somewhere inside the parser rather than at its front door.
 *
 * Seeds are hex literals rather than calls into `reticulum-ts`: this module must
 * load on a clean checkout, before `dist/` exists.
 *
 * @typedef {{ id: string, why: string, seeds: readonly string[] }} DifferentialTarget
 * @type {readonly DifferentialTarget[]}
 */
export const DIFFERENTIAL_TARGETS = [
  {
    id: "packet-unpack",
    why: "Packet.decode against RNS.Packet.unpack",
    seeds: [
      // The committed packet vectors: one HEADER_1 data packet, one HEADER_2
      // announce carrying a transport id.
      "0402086b1879b803be27667b9f1e6b7d0c430968656c6c6f207061636b6574",
      "510300112233445566778899aabbccddeeff086b1879b803be27667b9f1e6b7d0c430b616e6e6f756e6365",
      // A full announce, whose length is what makes the header/payload boundary
      // worth attacking.
      "01003991d98e90e45823bf84b19a7b36fe600007a37cbc142093c8b755dc1b10e86cb426374ad16aa853ed0bdfc0b2b86d1c7ce7f162a10bec559afea195e4dce84b69568d5d2cb0963eb446c0685e2b17f2f05ffb8cc6571b34ebef3c0102030405060708090a266f3dc9cd8db73e075bef9614645bb7afbfd90f2f369ec89b583961532c7776f2de2744d8b4243296b04f3e64e7a8a442056122f7b216739505cf19cda3790a616e6e6f756e6365206170702064617461",
      // The shortest input either side accepts, so truncation mutations land on
      // the boundary rather than far below it.
      "0400000102030405060708090a0b0c0d0e0f00",
    ],
  },
  {
    id: "resource-advert",
    why: "ResourceAdvertisement.unpack against RNS.Resource.ResourceAdvertisement.unpack",
    seeds: [
      // Emitted by the reference itself:
      //   umsgpack.packb({"t":1024,"d":512,"n":4,"h":...,"q":None})
      // All five flag bits set, so the flag decode is exercised, and `q` nil.
      "8ba174cd0400a164cd0200a16e04a168c410000102030405060708090a0b0c0d0e0fa172c4080001020304050607a16fc410000102030405060708090a0b0c0d0e0fa16dc40400010203a1661fa16901a16c01a171c0",
      // The same shape with `q` present and a single flag bit, which is the
      // request/response classification path.
      "8ba174cd0400a164cd0200a16e04a168c410000102030405060708090a0b0c0d0e0fa172c4080001020304050607a16fc410000102030405060708090a0b0c0d0e0fa16dc40400010203a16602a16901a16c01a171c40400010203",
    ],
  },
  {
    id: "msgpack",
    why: "msgpackUnpack against RNS.vendor.umsgpack.unpackb",
    seeds: [
      "80",
      "90",
      "81a16101",
      "920102",
      "c404deadbeef",
      "c50004deadbeef",
      "d903616263",
      "cb400921fb54442d18",
      // A real advertisement map, so the mutations reach nested values rather
      // than only the outermost tag.
      "8ba174cd0400a164cd0200a16e04a168c410000102030405060708090a0b0c0d0e0fa172c4080001020304050607a16fc410000102030405060708090a0b0c0d0e0fa16dc40400010203a1661fa16901a16c01a171c0",
    ],
  },
];

/**
 * Every case this run will compare, as `{target, inputHex, operators}`.
 *
 * Deterministic in `seed`: the same seed produces the same cases on every
 * machine, which is what lets a red run be reproduced from the number in its
 * own output rather than from a log nobody kept.
 *
 * @param {{ seed: number, iterations: number }} options
 * @returns {{ target: string, inputHex: string, operators: string[] }[]}
 */
export function generateCases({ seed, iterations }) {
  /** @type {{ target: string, inputHex: string, operators: string[] }[]} */
  const cases = [];
  for (const target of DIFFERENTIAL_TARGETS) {
    // A distinct stream per target, so adding a target does not shift the cases
    // every other target draws.
    const random = createRandom(seed + hashTarget(target.id));
    const seeds = target.seeds.map(hexToBytes);
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const input = seeds[iteration % seeds.length];
      const { bytes, operators } = mutate(input, random);
      cases.push({
        target: target.id,
        inputHex: bytesToHex(bytes),
        operators,
      });
    }
    // The unmutated seeds too. Both sides must agree on a frame the reference
    // produced; if they do not, no mutation is needed to call it a bug.
    for (const hex of target.seeds) {
      cases.push({ target: target.id, inputHex: hex, operators: ["seed"] });
    }
  }
  return cases;
}

/** @param {string} target */
function hashTarget(target) {
  let hash = 0;
  for (const character of target) {
    hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  }
  return hash;
}

/**
 * A verdict is what one implementation did with one input.
 *
 * @typedef {{
 *   accepted: boolean,
 *   canonical: string | null,
 *   error: string | null,
 * }} Verdict
 */

/**
 * Normalise a TypeScript-side rejection into a stable reason code.
 *
 * The raw message is not usable as a key: it interpolates the offending tag
 * (`Unsupported msgpack tag 0xc7`), so every distinct bad byte would look like
 * a distinct divergence class and the allowance file would grow without bound.
 *
 * @param {string | null} error
 * @returns {string}
 */
export function normaliseTsReason(error) {
  if (error === null || error === "") return "rejected";
  if (/Unsupported msgpack tag/i.test(error)) return "unsupported-tag";
  if (/Unexpected end of msgpack input/i.test(error)) return "short-input";
  if (/Invalid resource advertisement/i.test(error))
    return "invalid-advertisement";
  if (/Expected msgpack/i.test(error)) return "unexpected-type";
  if (/out of range|invalid|malformed/i.test(error)) return "malformed";
  return "other";
}

/**
 * The Python side already sends an exception class name; kebab it and drop the
 * `Exception`/`Error` suffix so `InsufficientDataException` and a hypothetical
 * `InsufficientDataError` do not become two classes.
 *
 * @param {string | null} error
 * @returns {string}
 */
export function normalisePythonReason(error) {
  if (error === null || error === "") return "rejected";
  const name = error.split(":")[0].trim();
  return (
    name
      .replace(/(Exception|Error)$/u, "")
      .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
      .toLowerCase() || "rejected"
  );
}

/**
 * Compare one input's two verdicts.
 *
 * Returns `null` when they agree — including when both reject, which is the
 * overwhelmingly common case and deliberately not a finding. Agreement on a
 * rejection does not require agreement on *why*: two implementations are
 * entitled to their own error messages, and demanding they match would make
 * every message edit a protocol change.
 *
 * @param {string} target
 * @param {Verdict} ts
 * @param {Verdict} python
 * @returns {{ kind: string, direction: string, detail: string } | null}
 */
export function classifyDivergence(target, ts, python) {
  if (ts.accepted && python.accepted) {
    if (ts.canonical === python.canonical) return null;
    return {
      kind: `${target}:value-mismatch:${firstDifferingField(ts.canonical, python.canonical)}`,
      direction: "value-mismatch",
      detail: `ts=${truncate(ts.canonical)} python=${truncate(python.canonical)}`,
    };
  }

  if (ts.accepted && !python.accepted) {
    return {
      kind: `${target}:ts-accepts:${normalisePythonReason(python.error)}`,
      direction: "ts-accepts",
      detail: `python rejected: ${truncate(python.error)}`,
    };
  }

  if (!ts.accepted && python.accepted) {
    return {
      kind: `${target}:python-accepts:${normaliseTsReason(ts.error)}`,
      direction: "python-accepts",
      detail: `ts rejected: ${truncate(ts.error)}`,
    };
  }

  return null;
}

/**
 * The name of the first canonical field whose value differs, so a value
 * mismatch in `hops` and one in `data` are separate classes rather than one
 * undifferentiated `value-mismatch`.
 *
 * Canonical maps are emitted as `m{key=value,...}` with keys sorted, by both
 * sides, so a positional scan is enough.
 *
 * @param {string | null} left
 * @param {string | null} right
 * @returns {string}
 */
export function firstDifferingField(left, right) {
  const fields = (text) => {
    const match = /^m\{(.*)\}$/su.exec(text ?? "");
    if (match === null) return null;
    /** @type {Map<string, string>} */
    const entries = new Map();
    for (const part of splitTopLevel(match[1])) {
      const index = part.indexOf("=");
      if (index > 0) entries.set(part.slice(0, index), part.slice(index + 1));
    }
    return entries;
  };

  const leftFields = fields(left);
  const rightFields = fields(right);
  if (leftFields === null || rightFields === null) return "value";

  const names = [
    ...new Set([...leftFields.keys(), ...rightFields.keys()]),
  ].sort();
  for (const name of names) {
    if (leftFields.get(name) !== rightFields.get(name)) return name;
  }
  return "value";
}

/**
 * Split on commas that are not inside a nested `{}` or `[]`, so a nested map
 * whose own entries contain commas does not shred the outer split.
 *
 * @param {string} text
 * @returns {string[]}
 */
function splitTopLevel(text) {
  /** @type {string[]} */
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "{" || character === "[") depth += 1;
    else if (character === "}" || character === "]") depth -= 1;
    else if (character === "," && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  if (start < text.length) parts.push(text.slice(start));
  return parts;
}

/** @param {string | null} text */
function truncate(text, limit = 160) {
  if (text === null) return "null";
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

/**
 * @typedef {{ kind: string, reason: string, example?: string }} Allowance
 */

/** @returns {Allowance[]} */
export function loadAllowances() {
  if (!existsSync(ALLOWANCE_PATH)) return [];
  const parsed = JSON.parse(readFileSync(ALLOWANCE_PATH, "utf8"));
  return parsed.allowances ?? [];
}

/**
 * Reduce a run's divergences to the report the gate acts on.
 *
 * Recorded kinds are the ones a person has looked at and written down a reason
 * for; anything else fails the gate. This is the same shape as the Sans-IO
 * allowance list and for the same reason: the interesting number is not "how
 * many disagreements are there" — two independent parsers of a wire format
 * always have some — but "has a new kind of disagreement appeared".
 *
 * Unused allowances are reported but not failed. Which kinds a run reaches
 * depends on the seed and the iteration count, so failing on an unused one
 * would make raising `DIFFERENTIAL_ITERATIONS` turn the gate red for no reason
 * — the noisy-measurement trap `benchmark-rules.json` documents.
 *
 * @param {{ kind: string }[]} divergences
 * @param {Allowance[]} allowances
 */
export function summariseDivergences(divergences, allowances) {
  const allowed = new Set(allowances.map((entry) => entry.kind));
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const divergence of divergences) {
    counts.set(divergence.kind, (counts.get(divergence.kind) ?? 0) + 1);
  }

  const kinds = [...counts.keys()].sort();
  return {
    kinds: kinds.map((kind) => ({ kind, count: counts.get(kind) ?? 0 })),
    unrecorded: kinds.filter((kind) => !allowed.has(kind)),
    unused: allowances
      .map((entry) => entry.kind)
      .filter((kind) => !counts.has(kind))
      .sort(),
  };
}
