/**
 * PR gates whose command needs compiled workspace packages.
 *
 * CI runs `npm run build` only for these. Every other PR gate must produce the
 * same result on a clean checkout as on a tree that has already been built —
 * a gate whose answer depends on `dist/` existing is not a gate.
 */
export const prebuildPrGates = [
  "unit-tests",
  "coverage",
  "structure",
  "properties",
  "harness-mobile-typecheck",
  "census",
];

export const gates = [
  gate("lint", "TypeScript and Sans-IO lint", "lint", "pr", ["node"]),
  // The Expo app is not a `tsc -b` project — it emits nothing, it is checked by
  // its own pinned compiler, and composite mode would demand declaration-emit
  // shapes and a hand-listed set of generated `.mjs` inputs. It gets its own
  // gate instead, so `npm run typecheck` stays incremental and the app's
  // TypeScript is still checked on every PR.
  gate(
    "harness-mobile-typecheck",
    "Harness-mobile typecheck",
    "harness-mobile:typecheck",
    "pr",
    ["node"],
  ),
  gate("unit-tests", "Unit tests", "test", "pr", ["node"]),
  gate(
    "file-sizes",
    "File-size ratchet",
    "sizes",
    "pr",
    ["node"],
    ["file-sizes.json"],
  ),
  gate("release-harness", "Release harness", "test:release-harness", "pr", [
    "node",
  ]),
  gate("doc-audit", "Documentation audit", "test:doc-audit", "pr", ["node"]),
  gate(
    "sim-authored-replay",
    "Authored simulation replay",
    "test:sim-authored-replay",
    "pr",
    ["node"],
  ),
  gate("actionlint", "GitHub Actions lint", "actionlint", "pr", ["actionlint"]),
  gate(
    "coverage",
    "Coverage ratchet",
    "coverage:check",
    "pr",
    ["node"],
    ["coverage/coverage-summary.json", "coverage-ratchet.json"],
    "coverage",
  ),
  gate(
    "structure",
    "Dependency structure",
    "structure:check",
    "pr",
    ["node"],
    ["structure.json", "structure-ratchet.json"],
  ),
  gate(
    "complexity",
    "Function complexity ratchet",
    "complexity:check",
    "pr",
    ["node"],
    ["complexity.json", "complexity-ratchet.json"],
    "complexity",
  ),
  gate(
    "complexity-multilang",
    "Multi-language function complexity",
    "complexity:multilang",
    "pr",
    ["node", "lizard"],
    ["complexity-multilang.json", "complexity-multilang-rules.json"],
  ),
  gate(
    "coupling",
    "Module coupling and modularity",
    "coupling:check",
    "pr",
    ["node"],
    ["coupling.json", "coupling-rules.json"],
  ),
  gate(
    "api-surface",
    "Public API surface",
    "api:check",
    "pr",
    ["node"],
    ["api-surface.json", "api-surface-limits.json"],
  ),
  // Measures the apparatus, not the code: gates, CI jobs, conformance runners
  // and test counts that may not quietly shrink. Every other gate here gets
  // *easier* when tests are deleted or a gate is dropped; this one is the
  // reason that cannot happen unnoticed.
  gate(
    "census",
    "Quality surface census",
    "census:check",
    "pr",
    ["node"],
    ["census.json", "census-ratchet.json"],
  ),
  gate(
    "lint-all",
    "Repository lint coverage",
    "lint:all",
    "pr",
    ["node"],
    ["lint.json", "lint-ratchet.json"],
  ),
  gate(
    "typed-lint",
    "Typed asynchronous lint",
    "lint:typed",
    "pr",
    ["node"],
    ["typed-lint.json", "typed-lint-ratchet.json"],
  ),
  gate(
    "format",
    "Formatting ratchet",
    "format:check",
    "pr",
    ["node"],
    ["format.json", "format-ratchet.json"],
  ),
  gate("properties", "Property-based protocol tests", "test:properties", "pr", [
    "node",
  ]),
  gate(
    "audit-policy",
    "Advisory allowlist policy",
    "audit:policy",
    "pr",
    ["node"],
    ["audit-allowlist.json"],
  ),
  gate(
    "mutation-policy",
    "Mutation score policy",
    "mutation:ratchet",
    "pr",
    ["node"],
    ["mutation-ratchet.json"],
  ),
  gate(
    "secrets",
    "Secret scanning",
    "secrets:check",
    "pr",
    ["gitleaks"],
    ["gitleaks.json"],
  ),
  gate(
    "licenses",
    "Dependency license policy",
    "licenses:check",
    "pr",
    ["node"],
    ["licenses.json", "license-allowlist.json"],
  ),
  gate(
    "rust",
    "Rust clippy, fmt, and deny",
    "lint:rust",
    "pr",
    ["rust", "cargo-deny"],
    ["artifacts/languages/rust.json"],
  ),
  gate(
    "shell",
    "ShellCheck",
    "lint:shell",
    "pr",
    ["shellcheck"],
    ["artifacts/languages/shell.json"],
  ),
  gate(
    "python",
    "Python ruff and mypy",
    "lint:python",
    "pr",
    ["python", "ruff", "mypy"],
    ["artifacts/languages/python.json"],
  ),
  gate(
    "kotlin",
    "Kotlin lint",
    "lint:kotlin",
    "pr",
    ["jvm", "ktlint"],
    ["artifacts/languages/kotlin.json"],
  ),
  gate(
    "swift",
    "Swift lint",
    "lint:swift",
    "pr",
    ["macos", "swiftlint"],
    ["artifacts/languages/swift.json"],
    "generic",
    "macos-15",
  ),
  gate(
    "audit",
    "Dependency advisory scan",
    "audit:nightly",
    "nightly",
    ["node"],
    ["audit.json"],
  ),
  // Release tier: not run per PR, and required before a plan-duration soak.
  // `audit-policy` on the PR tier only checks that the allowlist is well-formed
  // and unexpired — it never runs `npm audit`, so it stays green while alerts
  // are open. This one reconciles npm audit and Dependabot against the
  // allowlist, and the soak guard refuses to start until it passes.
  gate(
    "advisories",
    "Unresolved dependency advisories",
    "audit:advisories",
    "release",
    ["node", "network"],
    ["audit.json"],
  ),
  gate(
    "hotspots",
    "Churn-weighted complexity hotspots",
    "hotspots",
    "nightly",
    ["node", "lizard"],
    ["hotspots.json"],
  ),
  gate(
    "sbom",
    "CycloneDX SBOM",
    "sbom",
    "nightly",
    ["node"],
    ["sbom.cdx.json"],
  ),
  gate(
    "mutation",
    "Protocol mutation score",
    "mutation:check",
    "nightly",
    ["node"],
    ["reports/mutation/mutation.json", "mutation-ratchet.json"],
    "mutation",
  ),
];

// Gates too slow to sit on the Pages publish path. The Pages workflow neither
// runs nor imports these; it records them as deferred and publishes without
// them, so a ~70 minute gate cannot hold the site hostage. They still run on
// the nightly schedule, and mutation-policy keeps reporting the committed
// ratchet floor in the meantime.
export const deferredOnPages = new Set(["mutation"]);

function gate(
  id,
  title,
  script,
  tier,
  requires,
  artifacts = [],
  summary = "generic",
  os = "ubuntu-latest",
) {
  return {
    id,
    title,
    command: ["npm", "run", script],
    tier,
    requires,
    artifacts: [
      `artifacts/checks/${id}.json`,
      `artifacts/logs/${id}.log`,
      ...artifacts,
    ],
    summary,
    os,
  };
}

export function gateById(id) {
  return gates.find((candidate) => candidate.id === id);
}
