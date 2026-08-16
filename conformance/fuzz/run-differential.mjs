#!/usr/bin/env node
/**
 * Differential fuzzing against the pinned Python reference: the impure half.
 *
 * Builds `conformance/docker` (rns==0.9.5, lxmf==0.7.0), feeds it the same
 * structured-random bytes this process feeds our own decoders, and compares the
 * two answers. See `conformance/fuzz/differential.mjs` for why a "does not
 * throw" fuzzer needed an oracle at all, and for the comparison logic — which
 * lives there, without Docker or `dist/`, so it can be unit-tested on a machine
 * that cannot run the reference.
 *
 * This gate is registered rather than left behind `INTEROP=1`. The interop
 * suite is opt-in because it needs live peers, timing, and network namespaces;
 * this needs one container that reads stdin and writes stdout, which is the
 * same class of dependency as `chromium`. And a check that runs only in CI is
 * the exact hole that let `test:web-examples` sit red for 40+ runs without
 * `/results/` noticing, so it declares a `docker` requirement token and
 * publishes an artifact like every other gate.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  Packet,
  NodeCryptoProvider,
  ResourceAdvertisement,
} from "../../packages/reticulum-ts/dist/index.js";
import { msgpackUnpack } from "../../packages/protocol/dist/index.js";
import { corpusFor, recordCounterexample } from "./corpus.mjs";
import {
  DIFFERENTIAL_TARGETS,
  allowancePath,
  classifyDivergence,
  generateCases,
  hexToBytes,
  loadAllowances,
  summariseDivergences,
} from "./differential.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const provider = new NodeCryptoProvider();

const IMAGE = "twistedpear-conformance-reference:differential";
const SEED = Number.parseInt(process.env.DIFFERENTIAL_SEED ?? "20260815", 10);
const ITERATIONS = Number.parseInt(
  process.env.DIFFERENTIAL_ITERATIONS ?? "384",
  10,
);
/** Corpus target prefix, so replayed differential cases never collide with the
 * crash fuzzers' own entries in the same file. */
const CORPUS_PREFIX = "differential/";

/** The advertisement fields both implementations have, in the order RNS lists
 * them, plus the five flag bits it derives from `f`. */
const ADVERTISEMENT_FIELDS = [
  "t",
  "d",
  "n",
  "h",
  "r",
  "o",
  "m",
  "f",
  "i",
  "l",
  "q",
  "e",
  "c",
  "s",
  "u",
  "p",
];

function writeReport(report) {
  const directory = join(repoRoot, "artifacts/differential-fuzz");
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, "differential-fuzz.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

/**
 * Canonicalise a native JavaScript value into the grammar
 * `conformance/scenarios/python/differential_fuzz.py` emits.
 *
 * Numbers are the only place the two languages cannot be made to agree by
 * construction: JavaScript has one numeric type, so an integer-valued float is
 * indistinguishable from an integer here and distinguishable there. Integral
 * values are therefore rendered as integers on both sides, and the msgpack
 * target — the one place the distinction is carried explicitly in the decoded
 * value — uses `canonicalMsgpack` below instead.
 */
function canonicalNative(value) {
  if (value === null || value === undefined) return "n";
  if (typeof value === "boolean") return value ? "b:true" : "b:false";
  if (typeof value === "number") {
    return Number.isInteger(value) ? `i:${value}` : `f:${float64Hex(value)}`;
  }
  if (typeof value === "string") return `s:${utf8Hex(value)}`;
  if (value instanceof Uint8Array) return `x:${hex(value)}`;
  if (Array.isArray(value)) return `[${value.map(canonicalNative).join(",")}]`;
  if (value instanceof Map) {
    return canonicalEntries(
      [...value.entries()].map(
        ([key, item]) => `${canonicalNative(key)}=${canonicalNative(item)}`,
      ),
    );
  }
  return `?:${typeof value}`;
}

/** Canonicalise the tagged msgpack union, which does carry int-vs-float. */
function canonicalMsgpack(value) {
  switch (value.type) {
    case "nil":
      return "n";
    case "int":
      return `i:${value.int}`;
    case "float":
      return `f:${float64Hex(value.float)}`;
    case "bin":
      return `x:${hex(value.bin)}`;
    case "array":
      return `[${value.array.map(canonicalMsgpack).join(",")}]`;
    case "map":
      return canonicalEntries(
        [...value.map.entries()].map(
          ([key, item]) => `i:${key}=${canonicalMsgpack(item)}`,
        ),
      );
    default:
      return `?:${value.type}`;
  }
}

function canonicalEntries(entries) {
  return `m{${[...entries].sort().join(",")}}`;
}

function canonicalFields(fields) {
  return canonicalEntries(
    Object.entries(fields).map(
      ([name, value]) => `${name}=${canonicalNative(value)}`,
    ),
  );
}

function float64Hex(value) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value, false);
  return hex(new Uint8Array(view.buffer));
}

function hex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function utf8Hex(text) {
  return hex(new TextEncoder().encode(text));
}

const accepted = (canonical) => ({ accepted: true, canonical, error: null });
const rejected = (error) => ({ accepted: false, canonical: null, error });

/** Our side's verdict for one case, in the same shape the driver returns. */
function typescriptVerdict(target, bytes) {
  try {
    if (target === "packet-unpack") {
      const packet = Packet.decode(provider, bytes);
      if (packet === null) return rejected(null);
      return accepted(
        canonicalFields({
          flags: packet.raw[0],
          hops: packet.hops,
          headerType: packet.headerType,
          contextFlag: packet.contextFlag,
          transportType: packet.transportType,
          destinationType: packet.destinationType,
          packetType: packet.packetType,
          transportId: packet.transportId,
          destinationHash: packet.destinationHash,
          context: packet.context,
          data: packet.data,
        }),
      );
    }

    if (target === "resource-advert") {
      const advertisement = ResourceAdvertisement.unpack(bytes);
      // Named rather than spread-minus-`x`: `x` is ours alone — RNS 0.9.5 has
      // no such field — so including it would report a divergence on every
      // accepted advertisement, and a future field added on either side should
      // show up as a comparison someone has to write, not silently join or
      // leave the canonical form.
      return accepted(
        canonicalFields(
          Object.fromEntries(
            ADVERTISEMENT_FIELDS.map((name) => [name, advertisement[name]]),
          ),
        ),
      );
    }

    if (target === "msgpack") {
      return accepted(canonicalMsgpack(msgpackUnpack(bytes)));
    }

    return rejected(`unknown target ${target}`);
  } catch (error) {
    return rejected(error instanceof Error ? error.message : String(error));
  }
}

/** Build the pinned reference image, and say plainly when Docker is the problem. */
function buildImage() {
  const dockerfile = readFileSync(
    join(repoRoot, "conformance/docker/Dockerfile"),
    "utf8",
  );
  const rns = dockerfile.match(/^ARG RNS_VERSION=(.+)$/m)?.[1];
  const lxmf = dockerfile.match(/^ARG LXMF_VERSION=(.+)$/m)?.[1];
  if (!rns || !lxmf) {
    throw new Error("Could not read pinned reference versions from Dockerfile");
  }
  // Docker resolves the base-image manifest even when every layer is cached.
  // That makes an otherwise hermetic gate depend on Docker Hub availability.
  // Reuse a local image only after asking the image itself for both pinned
  // package versions; the current driver is mounted read-only at run time.
  const cached = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "none",
      IMAGE,
      "python",
      "-c",
      "import RNS,LXMF; print(RNS.__version__, LXMF.__version__)",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (cached.status === 0 && cached.stdout.trim() === `${rns} ${lxmf}`) {
    return;
  }
  const built = spawnSync(
    "docker",
    [
      "build",
      "-q",
      "-t",
      IMAGE,
      "-f",
      "conformance/docker/Dockerfile",
      ".",
      "--build-arg",
      "UNPINNED=0",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (built.status !== 0) {
    throw new Error(
      `Could not build the pinned reference image.\n${built.stderr ?? ""}`,
    );
  }
}

/**
 * Run every case through the reference in one container.
 *
 * One invocation for the whole run, not one per case: container start-up is
 * tens of milliseconds and there are hundreds of cases, so per-case spawning
 * would put the gate's cost entirely in Docker rather than in the comparison.
 */
function referenceVerdicts(cases) {
  const run = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "-i",
      "--network",
      "none",
      "-v",
      `${join(repoRoot, "conformance")}:/conformance:ro`,
      IMAGE,
      "python",
      "/conformance/scenarios/python/differential_fuzz.py",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      input: JSON.stringify({ cases }),
      maxBuffer: 256 * 1024 * 1024,
    },
  );
  if (run.status !== 0) {
    throw new Error(`Reference driver failed.\n${run.stderr ?? ""}`);
  }
  const parsed = JSON.parse(run.stdout);
  if (parsed.verdicts.length !== cases.length) {
    throw new Error(
      `Reference returned ${parsed.verdicts.length} verdicts for ${cases.length} cases`,
    );
  }
  return parsed;
}

/**
 * The committed counterexamples for every differential target, replayed before
 * any freshly drawn case for the reason `corpus.mjs` gives: a disagreement
 * found once and lost is a lottery ticket, not a regression test.
 */
function replayCases() {
  return DIFFERENTIAL_TARGETS.flatMap((target) =>
    corpusFor(`${CORPUS_PREFIX}${target.id}`).map((example) => ({
      target: target.id,
      inputHex: example.inputHex,
      operators: ["corpus-replay"],
    })),
  );
}

function main() {
  const cases = [
    ...replayCases(),
    ...generateCases({ seed: SEED, iterations: ITERATIONS }),
  ];
  buildImage();
  const reference = referenceVerdicts(cases);

  const divergences = [];
  for (const [index, testCase] of cases.entries()) {
    const ours = typescriptVerdict(
      testCase.target,
      hexToBytes(testCase.inputHex),
    );
    const theirs = reference.verdicts[index];
    const divergence = classifyDivergence(testCase.target, ours, theirs);
    if (divergence !== null) {
      divergences.push({ ...testCase, ...divergence });
    }
  }

  const allowances = loadAllowances();
  const summary = summariseDivergences(divergences, allowances);

  // Only unrecorded kinds go into the corpus. Committing an example of every
  // allowed divergence too would add hundreds of cases per run and drown the
  // one that matters — the same reason the crash fuzzers record on failure
  // rather than on every input.
  const unrecorded = new Set(summary.unrecorded);
  let recorded = 0;
  for (const divergence of divergences) {
    if (!unrecorded.has(divergence.kind)) continue;
    if (
      recordCounterexample({
        target: `${CORPUS_PREFIX}${divergence.target}`,
        inputHex: divergence.inputHex,
        operators: divergence.operators,
        error: `${divergence.kind}: ${divergence.detail}`,
      })
    ) {
      recorded += 1;
    }
  }

  const ok = summary.unrecorded.length === 0;
  writeReport({
    ok,
    seed: SEED,
    iterations: ITERATIONS,
    reference: reference.reference,
    cases: cases.length,
    divergentCases: divergences.length,
    kinds: summary.kinds,
    unrecordedKinds: summary.unrecorded,
    unusedAllowances: summary.unused,
    examples: summary.unrecorded.map((kind) => {
      const example = divergences.find((entry) => entry.kind === kind);
      return {
        kind,
        inputHex: example.inputHex,
        operators: example.operators,
        detail: example.detail,
      };
    }),
  });

  console.log(
    `differential fuzz: ${cases.length} cases against rns ${reference.reference.rns} / lxmf ${reference.reference.lxmf}`,
  );
  for (const { kind, count } of summary.kinds) {
    console.log(
      `  ${unrecorded.has(kind) ? "NEW " : "    "}${kind} × ${count}`,
    );
  }
  for (const kind of summary.unused) {
    console.log(`  (allowance not reached this run: ${kind})`);
  }

  if (!ok) {
    console.error(
      `\n${summary.unrecorded.length} unrecorded divergence kind(s) against the pinned reference.`,
    );
    for (const kind of summary.unrecorded) {
      const example = divergences.find((entry) => entry.kind === kind);
      console.error(
        `  ${kind}\n    input ${example.inputHex}\n    ${example.detail}\n    operators ${example.operators.join(" → ")}`,
      );
    }
    console.error(
      `\nRecorded ${recorded} counterexample(s) to the fuzz corpus — commit them.`,
    );
    console.error(
      `Either fix the decoder, or record the kind with its reason in ${allowancePath()}.`,
    );
    process.exit(1);
  }
}

main();
