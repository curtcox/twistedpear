import { writeFile } from "node:fs/promises";
import { evaluateApproval } from "../packages/protocol/dist/index.js";

/** Fixture values for the vector. Not a product default. */
const thresholds = {
  sensitiveMinObservedMs: 7,
  sensitiveMinStableMs: 3,
  criticalMinObservedMs: 30,
  criticalMinStableMs: 14,
  criticalMinAttestations: 2,
};

const none = {
  publisherTrust: null,
  observedAgeMs: null,
  hashAgeMs: null,
  attestationCount: 0,
};

const cases = [
  { id: "benign-empty", request: { capabilities: [] }, evidence: none },
  {
    id: "benign-storage",
    request: { capabilities: ["storage:kv", "presence"] },
    evidence: none,
  },
  {
    id: "elevated-identity",
    request: { capabilities: ["identity"] },
    evidence: none,
  },
  {
    id: "sensitive-none",
    request: { capabilities: ["lxmf:send"] },
    evidence: none,
  },
  {
    id: "sensitive-complete-imported",
    request: { capabilities: ["lxmf:send"] },
    evidence: {
      publisherTrust: "imported",
      observedAgeMs: 7,
      hashAgeMs: 3,
      attestationCount: 1,
    },
  },
  {
    id: "sensitive-provenance-via-attestation",
    request: { capabilities: ["lxmf:send"] },
    evidence: {
      publisherTrust: null,
      observedAgeMs: 7,
      hashAgeMs: 3,
      attestationCount: 1,
    },
  },
  {
    id: "sensitive-missing-review",
    request: { capabilities: ["lxmf:send"] },
    evidence: {
      publisherTrust: "imported",
      observedAgeMs: 7,
      hashAgeMs: 3,
      attestationCount: 0,
    },
  },
  {
    id: "sensitive-missing-age",
    request: { capabilities: ["lxmf:send"] },
    evidence: {
      publisherTrust: "imported",
      observedAgeMs: 6,
      hashAgeMs: 3,
      attestationCount: 1,
    },
  },
  {
    id: "sensitive-missing-stability",
    request: { capabilities: ["lxmf:send"] },
    evidence: {
      publisherTrust: "imported",
      observedAgeMs: 7,
      hashAgeMs: 2,
      attestationCount: 1,
    },
  },
  {
    id: "sensitive-introduced-counts",
    request: { capabilities: ["lxmf:send"] },
    evidence: {
      publisherTrust: "introduced",
      observedAgeMs: 7,
      hashAgeMs: 3,
      attestationCount: 1,
    },
  },
  {
    id: "critical-none",
    request: { capabilities: ["relay:configure"] },
    evidence: none,
  },
  {
    id: "critical-imported-not-direct",
    request: { capabilities: ["relay:configure"] },
    evidence: {
      publisherTrust: "imported",
      observedAgeMs: 30,
      hashAgeMs: 14,
      attestationCount: 2,
    },
  },
  {
    id: "critical-complete",
    request: { capabilities: ["relay:configure"] },
    evidence: {
      publisherTrust: "direct",
      observedAgeMs: 30,
      hashAgeMs: 14,
      attestationCount: 2,
    },
  },
  {
    id: "critical-short-k",
    request: { capabilities: ["relay:configure"] },
    evidence: {
      publisherTrust: "direct",
      observedAgeMs: 30,
      hashAgeMs: 14,
      attestationCount: 1,
    },
  },
  {
    id: "critical-below-t3-t4",
    request: { capabilities: ["relay:configure"] },
    evidence: {
      publisherTrust: "direct",
      observedAgeMs: 7,
      hashAgeMs: 3,
      attestationCount: 2,
    },
  },
  {
    id: "offer-bound-messenger-elevated",
    request: { capabilities: ["lxmf:send"], offerBound: ["lxmf:send"] },
    evidence: none,
  },
  {
    id: "wiretap-promoted-critical",
    request: { capabilities: ["device:microphone:pcm", "lxmf:send"] },
    evidence: none,
  },
];

const vector = {
  schema: "twistedpear.decision-v1",
  machine: "approval-evaluate",
  generatedBy: "scripts/vectors-generate-approval.mjs",
  thresholds,
  cells: cases.map((cell) => ({
    ...cell,
    expected: evaluateApproval(cell.request, cell.evidence, thresholds),
  })),
};

await writeFile(
  new URL("../conformance/vectors/approval.json", import.meta.url),
  `${JSON.stringify(vector, null, 2)}\n`,
);
console.log(`approval.json cells=${vector.cells.length}`);
