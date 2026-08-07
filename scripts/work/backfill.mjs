#!/usr/bin/env node
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { loadAllRegisterRows } from "../doc-audit/register.mjs";
import { canonicalMetadata, loadMetadata, saveMetadata } from "./lib.mjs";
import { readDoc, findRow, byColumn } from "./table.mjs";

/**
 * One-shot seeding of work/metadata.json from the registers as they stood when
 * the work tooling landed. Classification cannot be inferred from a markdown
 * row, so it is recorded here once and reviewed by hand; `verify` and `added`
 * are lifted from the register columns and the document audit dates.
 *
 * Re-running is safe: existing entries are preserved unless --overwrite.
 */

/** Prerequisites declared in prose in STATUS-HARDWARE.md, plus the acquisition table. */
const HARDWARE = {
  H1: { requires: ["res:android-phone-1"] },
  H2: { requires: ["res:android-phone-1", "res:android-phone-2", "res:lan"] },
  H3: { requires: ["res:android-phone-2"] },
  H4: { requires: ["res:rnode-pair", "res:android-phone-1"] },
  H5: { requires: ["res:iphone"], status: "deferred" },
  H6: { requires: ["res:android-phone-1", "res:lan"] },
  H7: { requires: ["res:android-phone-1", "res:android-phone-2", "H2"] },
  H8: { requires: ["res:rnode-pair", "H4"] },
  H9: { requires: ["res:android-phone-1", "res:android-phone-2", "H2"] },
  H10: { requires: ["res:android-phone-1", "res:lan"] },
  H11: { requires: ["res:android-phone-1"] },
  H12: { requires: ["res:apple-developer-account"] },
  H13: { requires: ["res:iphone"] },
  H14: { requires: ["res:iphone", "res:android-phone-1"] },
  H15: { requires: ["res:iphone", "res:android-phone-1", "res:lan"] },
  H16: { requires: ["res:iphone", "res:rnode-pair", "H4"] },
  H17: { requires: ["res:windows-machine"] },
  H18: { requires: ["res:second-desktop", "res:android-phone-1", "res:lan"] },
  H19: { requires: ["res:rnode-pair", "H4"] },
  H20: { requires: ["res:linux-server"] },
  H21: { requires: ["res:android-phone-1", "res:lan"] },
  H22: { requires: ["res:rnode-pair", "res:android-phone-1"] },
  H23: {
    requires: [
      "res:android-phone-1",
      "res:android-phone-2",
      "res:ntfy-service",
    ],
  },
};

/** Release gates, with the prerequisites RELEASE-PLAN.md §2 states in prose. */
const GATES = {
  G1: {
    requires: [
      "RQ-LINK",
      "RQ-TRANSPORT",
      "RQ-INTEGRATION",
      "RQ-DIST",
      "RQ-MIXED",
      "RQ-MINIAPP",
      "RQ-IOS",
      "RQ-DESKTOP",
      "RQ-RETICULUM",
    ],
    verify: "npm run validate:mac -- --stage 8 --plan-duration",
  },
  G2: {
    requires: [
      "H1",
      "H2",
      "H3",
      "H6",
      "H7",
      "H9",
      "H10",
      "H11",
      "H18",
      "H20",
      "H21",
    ],
    verify: "runbook:STATUS-HARDWARE.md#phase-exit-checklists",
  },
  G3: { requires: [], verify: "npm run test:sim-campaign" },
  G4: { requires: ["H9", "H11"], verify: "npm run test:hostile-apps" },
  G5: {
    requires: ["H12"],
    verify: "runbook:RELEASE-PLAN.md#s7--packaging-and-release-candidate",
  },
  G6: {
    requires: ["G1", "G2", "G3", "G4", "G5"],
    verify: "npm run test:doc-audit",
  },
  G7: { requires: [], verify: "npm run test:hostile-apps" },
};

/** Soak durations are stated in the completion-criterion column; lift them verbatim. */
const SOAK_VERIFY = {
  "RQ-LINK": "LINK_SOAK_DURATION_MS=3600000 npm run test:link-soak",
  "RQ-TRANSPORT":
    "TRANSPORT_SOAK_DURATION_MS=259200000 npm run test:transport-node-soak",
  "RQ-INTEGRATION": "SOAK_DURATION_MS=86400000 npm run test:integration-soak",
  "RQ-DIST": "SOAK_DURATION_MS=86400000 npm run test:dist-soak",
  "RQ-MIXED": "SOAK_DURATION_MS=86400000 npm run test:mixed-network-soak",
  "RQ-MINIAPP": "SOAK_DURATION_MS=86400000 npm run test:miniapp-soak",
  "RQ-IOS":
    "SOAK_DURATION_MS=86400000 IOS_LIFECYCLE_CYCLES=100 npm run test:ios-soak:required",
  "RQ-DESKTOP":
    "SOAK_DURATION_MS=300000 DESKTOP_SOAK_CYCLES=864 npm run test:desktop-soak",
  "RQ-RETICULUM": "npm run release:status",
};

/** Dates the registers record as their audit or consolidation date. */
const ADDED = {
  "STATUS-SOFTWARE.md": "2026-07-31",
  "STATUS-HARDWARE.md": "2026-07-06",
  "RELEASE-PLAN.md": "2026-07-19",
  "STATUS-COMPLETE.md": "2026-07-20",
};

/**
 * @param {import("../doc-audit/register.mjs").RegisterRow} row
 * @param {string} root
 * @returns {{ type: string; requires: string[]; verify: string; added: string }}
 */
function classify(row, root) {
  const added = ADDED[row.file] ?? "2026-08-07";

  if (row.id.startsWith("RQ-")) {
    return {
      type: "release-gate",
      requires: [],
      verify: SOAK_VERIFY[row.id] ?? "npm run release:status",
      added,
    };
  }
  if (GATES[row.id]) {
    return { type: "release-gate", ...GATES[row.id], added };
  }
  if (HARDWARE[row.id]) {
    return {
      type: "feature",
      requires: HARDWARE[row.id].requires,
      verify: `runbook:STATUS-HARDWARE.md#${anchorFor(row.id, root)}`,
      added,
    };
  }
  return {
    type: "feature",
    requires: [],
    verify: verifyFromRow(row, root) || "runbook:STATUS-COMPLETE.md",
    added,
  };
}

/**
 * @param {string} id
 * @param {string} root
 * @returns {string}
 */
function anchorFor(id, root) {
  const text = readDoc(root, "STATUS-HARDWARE.md");
  const heading = text
    .split("\n")
    .find((line) => line.startsWith(`## ${id} `) || line === `## ${id}`);
  if (!heading) return id.toLowerCase();
  return heading
    .replace(/^##\s*/, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * @param {import("../doc-audit/register.mjs").RegisterRow} row
 * @param {string} root
 * @returns {string}
 */
function verifyFromRow(row, root) {
  const found = findRow(readDoc(root, row.file), row.id);
  if (!found) return "";
  const cells = byColumn(found.cells, found.table.columns);
  const raw = cells.Verify ?? cells["Completion criterion"] ?? "";
  const commands = [...raw.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  return commands.find((command) => command.startsWith("np")) ?? "";
}

const root = repoRoot();
const overwrite = process.argv.includes("--overwrite");
const write = process.argv.includes("--write");
const metadata = loadMetadata(root);

let added = 0;
for (const row of loadAllRegisterRows(root)) {
  if (metadata.items[row.id] && !overwrite) continue;
  const entry = classify(row, root);
  if (row.status === "done") {
    entry.completed = ADDED[row.file] ?? "2026-07-20";
    entry.evidence = evidenceFromRow(row, root);
  }
  metadata.items[row.id] = entry;
  added++;
}

/**
 * @param {import("../doc-audit/register.mjs").RegisterRow} row
 * @param {string} root
 * @returns {string[]}
 */
function evidenceFromRow(row, root) {
  const found = findRow(readDoc(root, row.file), row.id);
  if (!found) return [];
  const cells = byColumn(found.cells, found.table.columns);
  const raw = cells.Evidence ?? cells["Current evidence"] ?? "";
  const paths = [...raw.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  return paths.length > 0 ? paths : [row.file];
}

if (write) {
  saveMetadata(metadata, root);
  console.log(`wrote ${added} entries to work/metadata.json`);
} else {
  process.stdout.write(canonicalMetadata(metadata));
  console.error(`\n[dry run] ${added} entries; pass --write to save`);
}
