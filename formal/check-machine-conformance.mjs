import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  adaptStreamAdmission,
  admittedWithinHeadroom,
  decideStreamAdmission,
  decodeDeviceStreamFrame,
  degradationLadderFor,
  deviceSessionMachine,
  encodeDeviceStreamFrame,
  escrowMachine,
  egressOfferMachine,
  grantMachine,
  initialMediaReadinessState,
  recoveryQuorumMachine,
  selectPlane,
  stepMediaReadiness,
  streamMachine,
} from "../packages/protocol/dist/index.js";

const definitions = {
  grant: {
    machine: grantMachine,
    model: "../specs/spec-cap/model/grant.tla",
    traces: "../specs/spec-cap/model/grant-conformance-traces.json",
    vector: "grant.json",
  },
  escrow: {
    machine: escrowMachine,
    model: "../specs/spec-authority/model/escrow.tla",
    traces: "../specs/spec-authority/model/escrow-conformance-traces.json",
    vector: "escrow.json",
  },
  recovery: {
    machine: recoveryQuorumMachine,
    model: "../specs/spec-authority/model/recovery_quorum.tla",
    traces:
      "../specs/spec-authority/model/recovery-quorum-conformance-traces.json",
    vector: "recovery-quorum.json",
  },
  "device-session": {
    machine: deviceSessionMachine,
    model: "../specs/spec-device/model/device_session.tla",
    traces: "../specs/spec-device/model/device-session-conformance-traces.json",
    vector: "device-session.json",
  },
  stream: {
    machine: streamMachine,
    model: "../specs/spec-stream/model/stream.tla",
    traces: "../specs/spec-stream/model/stream-conformance-traces.json",
    vector: "stream.json",
  },
  "egress-offer": {
    machine: egressOfferMachine,
    model: "../specs/spec-cap/model/egress_offer.tla",
    traces: "../specs/spec-cap/model/egress-offer-conformance-traces.json",
    vector: "egress-offer.json",
  },
};

export function edgesFromTla(tla) {
  return [...tla.matchAll(/<<"([^"]+)",\s*"([^"]+)",\s*"([^"]+)">>/g)].map(
    (match) => [match[1], match[2], match[3]],
  );
}

const canonical = (edges) =>
  JSON.stringify(
    [...edges].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    ),
  );

export function assertMachineConformance({
  name,
  modelEdges,
  traceEdges,
  vectorEdges,
  executableEdges,
}) {
  const expected = canonical(modelEdges);
  for (const [source, edges] of [
    ["checked trace", traceEdges],
    ["executable table", executableEdges],
    ["Layer-3 vector", vectorEdges],
  ]) {
    if (canonical(edges) !== expected)
      throw new Error(`${name} TLA+ conformance mismatch in ${source}`);
  }
  return modelEdges.length;
}

export async function checkMachineConformance(name, machineOverride) {
  const definition = definitions[name];
  if (definition === undefined)
    throw new Error(`unknown formal machine: ${name}`);
  const [tla, traceText, vectorText] = await Promise.all([
    readFile(new URL(`./${definition.model}`, import.meta.url), "utf8"),
    readFile(new URL(`./${definition.traces}`, import.meta.url), "utf8"),
    readFile(
      new URL(`../conformance/vectors/${definition.vector}`, import.meta.url),
      "utf8",
    ),
  ]);
  const traces = JSON.parse(traceText);
  const vector = JSON.parse(vectorText);
  const machine = machineOverride ?? definition.machine;
  const count = assertMachineConformance({
    name,
    modelEdges: edgesFromTla(tla),
    traceEdges: traces.edges,
    executableEdges: machine.table.map((row) => [
      row.from,
      row.on.name,
      row.to,
    ]),
    vectorEdges: vector.cells
      .filter((cell) => cell.legal)
      .map((cell) => [cell.state, cell.eventClass, cell.expectedState.phase]),
  });
  if (name === "stream") assertStreamProperties();
  return { name, edges: count };
}

export function assertStreamProperties() {
  const selected = selectPlane([
    { plane: "reticulum", effectiveBps: 1_000_000, headroomBps: 1_000_000 },
    { plane: "webrtc", effectiveBps: 1_000_000, headroomBps: 1_000_000 },
  ]);
  if (selected?.plane !== "webrtc")
    throw new Error("stream plane order is not conforming");

  const admitted = decideStreamAdmission(
    { classId: "camera", tierId: "frames", rateHz: 30 },
    [{ plane: "reticulum", effectiveBps: 50_000, headroomBps: 50_000 }],
  );
  if (!admittedWithinHeadroom(admitted, 50_000))
    throw new Error("stream admission exceeds headroom");
  const adapted = adaptStreamAdmission({
    previous: admitted,
    supply: { plane: admitted.plane, effectiveBps: 1_000, headroomBps: 1_000 },
    ladder: degradationLadderFor("camera"),
    deficitStreak: 2,
  });
  if (adapted.rungIndex < admitted.rungIndex)
    throw new Error("stream degradation is not monotone");

  const requested = stepMediaReadiness(initialMediaReadinessState(), {
    kind: "readiness/request",
  });
  const refused = stepMediaReadiness(requested, { kind: "readiness/refuse" });
  const unreachable = stepMediaReadiness(requested, {
    kind: "readiness/unreachable",
  });
  if (JSON.stringify(refused) !== JSON.stringify(unreachable))
    throw new Error("readiness refusal leaks posture");

  const encoded = encodeDeviceStreamFrame({
    version: 2,
    sampleKind: 2,
    sessionToken: 1,
    sequence: 2,
    captureAtUs: 3,
    clockId: 4,
    payload: new Uint8Array([5]),
  });
  const decoded = decodeDeviceStreamFrame(encoded);
  if (
    decoded.version !== 2 ||
    decoded.captureAtUs !== 3 ||
    decoded.clockId !== 4
  ) {
    throw new Error("TPD2 timing round-trip is not conforming");
  }
}

async function main() {
  const requested = process.argv.slice(2);
  const names =
    requested.length === 0 || requested.includes("--all")
      ? Object.keys(definitions)
      : requested;
  for (const name of names) {
    const result = await checkMachineConformance(name);
    console.log(
      `${result.name} TLA+ relation conforms across ${result.edges} legal edges`,
    );
  }
}

if (
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
)
  await main();
