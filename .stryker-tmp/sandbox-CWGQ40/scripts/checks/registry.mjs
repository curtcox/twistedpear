// @ts-nocheck
export const gates = [
  gate("lint", "TypeScript and Sans-IO lint", "lint", "pr", ["node"]),
  gate("unit-tests", "Unit tests", "test", "pr", ["node"]),
  gate("file-sizes", "File-size ratchet", "sizes", "pr", ["node"], ["file-sizes.json"]),
  gate("release-harness", "Release harness", "test:release-harness", "pr", ["node"]),
  gate("doc-audit", "Documentation audit", "test:doc-audit", "pr", ["node"]),
  gate("sim-authored-replay", "Authored simulation replay", "test:sim-authored-replay", "pr", ["node"]),
  gate("actionlint", "GitHub Actions lint", "actionlint", "pr", ["actionlint"]),
  gate("coverage", "Coverage ratchet", "coverage:check", "pr", ["node"], ["coverage/coverage-summary.json", "coverage-ratchet.json"], "coverage"),
  gate("structure", "Dependency structure", "structure:check", "pr", ["node"], ["structure.json", "structure-ratchet.json"]),
  gate("complexity", "Function complexity ratchet", "complexity:check", "pr", ["node"], ["complexity.json", "complexity-ratchet.json"], "complexity"),
  gate("lint-all", "Repository lint coverage", "lint:all", "pr", ["node"], ["lint.json", "lint-ratchet.json"]),
  gate("typed-lint", "Typed asynchronous lint", "lint:typed", "pr", ["node"], ["typed-lint.json", "typed-lint-ratchet.json"]),
  gate("format", "Formatting ratchet", "format:check", "pr", ["node"], ["format.json", "format-ratchet.json"]),
  gate("properties", "Property-based protocol tests", "test:properties", "pr", ["node"]),
  gate("audit-policy", "Advisory allowlist policy", "audit:policy", "pr", ["node"], ["audit-allowlist.json"]),
  gate("mutation-policy", "Mutation score policy", "mutation:ratchet", "pr", ["node"], ["mutation-ratchet.json"]),
  gate("secrets", "Secret scanning", "secrets:check", "pr", ["gitleaks"], ["gitleaks.json"]),
  gate("licenses", "Dependency license policy", "licenses:check", "pr", ["node"], ["licenses.json", "license-allowlist.json"]),
  gate("rust", "Rust clippy, fmt, and deny", "lint:rust", "pr", ["rust", "cargo-deny"], ["artifacts/languages/rust.json"]),
  gate("shell", "ShellCheck", "lint:shell", "pr", ["shellcheck"], ["artifacts/languages/shell.json"]),
  gate("python", "Python ruff and mypy", "lint:python", "pr", ["python", "ruff", "mypy"], ["artifacts/languages/python.json"]),
  gate("kotlin", "Kotlin lint", "lint:kotlin", "pr", ["jvm", "ktlint"], ["artifacts/languages/kotlin.json"]),
  gate("swift", "Swift lint", "lint:swift", "pr", ["macos", "swiftlint"], ["artifacts/languages/swift.json"], "generic", "macos-15"),
  gate("audit", "Dependency advisory scan", "audit:nightly", "nightly", ["node"], ["audit.json"]),
  gate("sbom", "CycloneDX SBOM", "sbom", "nightly", ["node"], ["sbom.cdx.json"]),
  gate("mutation", "Protocol mutation score", "mutation:check", "nightly", ["node"], ["reports/mutation/mutation.json", "mutation-ratchet.json"], "mutation")
];

function gate(id, title, script, tier, requires, artifacts = [], summary = "generic", os = "ubuntu-latest") {
  return {
    id,
    title,
    command: ["npm", "run", script],
    tier,
    requires,
    artifacts: [`artifacts/checks/${id}.json`, `artifacts/logs/${id}.log`, ...artifacts],
    summary,
    os
  };
}

export function gateById(id) {
  return gates.find((candidate) => candidate.id === id);
}
