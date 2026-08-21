import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./repo-root.mjs";

/** @typedef {{ file: string; line: number; column: string; token: string; reason?: string }} PathFinding */

export const REGISTER_FILES = [
  "STATUS-COMPLETE.md",
  "STATUS-COMPLETE-PHASES.md",
  "STATUS-COMPLETE-PIPELINE.md",
  "STATUS-COMPLETE-APPS.md",
  "STATUS-SOFTWARE.md",
  "STATUS-HARDWARE.md",
  "RELEASE-PLAN.md",
];

/** Paths cited as evidence but produced locally (gitignored). */
const EPHEMERAL_EVIDENCE_PATHS = new Set([
  "conformance/sim-campaign/artifacts/report.json",
]);

/** @param {string} token */
export function isEphemeralEvidencePath(token) {
  if (EPHEMERAL_EVIDENCE_PATHS.has(token.replace(/^\.\//, ""))) return true;
  if (token === "conformance/sim-regressions/") return true;
  return false;
}

/** @param {string} token */
export function looksLikePathToken(token) {
  if (isEphemeralEvidencePath(token)) return false;
  if (!token || token === "—" || token === "same") return false;
  if (token.startsWith("npm ") || token.startsWith("INTEROP=")) return false;
  if (token.startsWith("node ") || token.startsWith("docker ")) return false;
  if (token.startsWith("gh ")) return false;
  if (/^test:[\w:-]+$/.test(token)) return false;
  if (/^demo:[\w-]+$/.test(token)) return false;
  if (/^\d/.test(token) && !token.includes("/")) return false;
  if (/^[A-Z][a-zA-Z0-9]+$/.test(token) && !token.includes("/")) return false;
  if (token.includes("§")) return false;
  if (token.startsWith("/")) return false;
  if (/^[A-Z_]+(_[A-Z0-9]+)*=/.test(token)) return false;
  if (token.includes(" ") && !token.includes("/")) return false;

  if (token.includes("/")) return true;
  if (token.endsWith("/")) return true;
  if (
    /\.(ts|tsx|js|mjs|cjs|json|yml|yaml|md|html|py|kt|swift|toml|txt|png|jpg)$/.test(
      token,
    )
  ) {
    return true;
  }
  if (token.includes("{") && token.includes("}")) return true;
  if (token.includes("*")) return true;
  return false;
}

/**
 * @param {string} path
 * @returns {string[]}
 */
export function expandBracePath(path) {
  const start = path.indexOf("{");
  if (start === -1) return [path];
  const end = path.indexOf("}", start);
  if (end === -1) return [path];
  const inner = path.slice(start + 1, end);
  const prefix = path.slice(0, start);
  const suffix = path.slice(end + 1);
  const parts = inner.split(",").map((p) => p.trim());
  return parts.flatMap((part) => expandBracePath(`${prefix}${part}${suffix}`));
}

/** @param {string} root @param {string} relPath */
export function pathExistsInRepo(root, relPath) {
  const normalized = relPath.replace(/^\.\//, "");
  return existsSync(join(root, normalized));
}

/** @param {string} root @param {string} basename */
function basenameSearch(root, basename) {
  try {
    const raw = execSync(`git ls-files '**/${basename}'`, {
      cwd: root,
      encoding: "utf8",
    });
    return raw.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/** @param {string} token */
function knownFullPath(token) {
  const map = {
    "transport/node.ts": "packages/reticulum-ts/src/transport/node.ts",
    "crypto/bare.ts": "packages/reticulum-ts/src/crypto/bare.ts",
    "bridge-hyper/": "packages/bridge-hyper/",
    "propagation-interop/run.mjs": "conformance/propagation-interop/run.mjs",
    "harness.mjs": "conformance/scenarios/ts/harness.mjs",
    "record-benchmark.mjs": "conformance/bare-runtime/record-benchmark.mjs",
    "swarm.ts": "packages/bridge-hyper/src/core/swarm.ts",
    "policy.ts": "packages/bridge-hyper/src/policy.ts",
    "ble-bridge/ios/": "apps/harness-mobile/modules/ble-bridge/ios/",
    "propagation_lxmd.py": "conformance/scenarios/python/propagation_lxmd.py",
    "propagation_publish.py":
      "conformance/scenarios/python/propagation_publish.py",
    "propagation_sync.py": "conformance/scenarios/python/propagation_sync.py",
    "bonjour.ts": "packages/reticulum-interfaces/src/bonjour.ts",
    "bonjour-mdns.ts": "packages/reticulum-interfaces/src/bonjour-mdns.ts",
    "capabilities.ts": "packages/miniapp-runtime/src/capabilities.ts",
    "host-api.ts": "packages/miniapp-runtime/src/host-api.ts",
    "lifecycle.ts": "packages/miniapp-runtime/src/lifecycle.ts",
    "crash-restart.mjs": "conformance/desktop/crash-restart.mjs",
    "runtime/web": "packages/reticulum-ts/src/runtime/web/runtime.ts",
    "packages/miniapp-runtime": "packages/miniapp-runtime/package.json",
    "miniapp-sdk": "packages/miniapp-sdk/package.json",
    cli: "packages/cli/package.json",
    "sdk-interop": "conformance/sdk-interop/run.mjs",
  };
  return map[token] ?? null;
}

/** @param {string} root @param {string} token @param {{ strictBasenames: boolean }} opts */
export function resolveEvidencePath(root, token, opts) {
  const expanded = expandBracePath(token);
  /** @type {string[]} */
  const resolved = [];

  for (let c of expanded) {
    c = c.replace(/^\.\//, "");
    if (c.startsWith("repo:")) c = c.slice("repo:".length);

    if (pathExistsInRepo(root, c)) {
      resolved.push(c);
      continue;
    }

    const known = knownFullPath(c);
    if (known && pathExistsInRepo(root, known)) {
      resolved.push(known);
      continue;
    }

    if (!opts.strictBasenames && !c.includes("/")) {
      const hits = basenameSearch(root, c);
      if (hits.length === 1) {
        resolved.push(hits[0]);
        continue;
      }
      if (hits.length > 1) {
        return { ok: false, expanded: hits, reason: "ambiguous basename" };
      }
    }

    if (c.endsWith(".test.ts") && !c.includes("/")) {
      const pkgHits = [
        ...basenameSearch(root, c).filter((p) => p.startsWith("packages/")),
      ];
      if (pkgHits.length === 1) {
        resolved.push(pkgHits[0]);
        continue;
      }
    }

    return { ok: false, expanded: [c], reason: "missing path" };
  }

  return { ok: true, expanded };
}

/**
 * @param {string} line
 * @returns {string[]}
 */
function backtickTokens(line) {
  /** @type {string[]} */
  const tokens = [];
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    tokens.push(m[1]);
  }
  return tokens;
}

/**
 * @param {string} root
 * @param {{ strictBasenames?: boolean; files?: string[] }} [options]
 * @returns {PathFinding[]}
 */
export function auditRegisterPaths(root = repoRoot(), options = {}) {
  const strictBasenames = options.strictBasenames ?? true;
  const files = options.files ?? REGISTER_FILES;
  /** @type {PathFinding[]} */
  const findings = [];

  for (const rel of files) {
    const abs = join(root, rel);
    const text = readFileSync(abs, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes("|") || !line.includes("`")) continue;
      if (/^\|[-| :]+\|$/.test(line.trim())) continue;

      const cells = line.split("|").slice(1, -1);
      if (cells.length < 2) continue;

      /** @type {{ name: string; index: number }[]} */
      const pathColumns = [];
      for (let c = 0; c < cells.length; c++) {
        const headerGuess = cells[c].toLowerCase();
        if (
          headerGuess.includes("evidence") ||
          headerGuess.includes("verify") ||
          headerGuess.includes("current evidence")
        ) {
          pathColumns.push({ name: "evidence", index: c });
        }
      }

      const isTableRow = cells.some((cell) => cell.includes("`"));
      if (!isTableRow) continue;

      const evidenceIdx = cells.length >= 4 ? 2 : cells.length >= 3 ? 1 : -1;
      const verifyIdx = cells.length >= 4 ? 3 : -1;
      const columns =
        evidenceIdx >= 0
          ? [
              { name: "Evidence", index: evidenceIdx },
              ...(verifyIdx >= 0 ? [{ name: "Verify", index: verifyIdx }] : []),
            ]
          : [];

      for (const col of columns) {
        const cell = cells[col.index] ?? "";
        for (const token of backtickTokens(cell)) {
          if (!looksLikePathToken(token)) continue;
          const result = resolveEvidencePath(root, token, { strictBasenames });
          if (!result.ok) {
            findings.push({
              file: rel,
              line: i + 1,
              column: col.name,
              token,
              reason: result.reason,
            });
          }
        }
      }
    }
  }

  return findings;
}
