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
  // Three measurements the survey has taken all along without ever acting on
  // them. Cyclomatic complexity was gated while cognitive complexity was not,
  // and nothing anywhere stopped duplication or `any` density from growing —
  // `any` in particular gets worse silently, since one added at a boundary
  // spreads downstream without a single new type error. The survey still runs
  // and stays advisory for the tools that answer questions rather than set
  // policy; these three now carry floors like every other dimension.
  gate(
    "jscpd",
    "Copy-paste clone ratchet",
    "jscpd:check",
    "pr",
    ["node"],
    ["reports/jscpd.json", "jscpd-ratchet.json"],
    "survey-ratchet",
  ),
  gate(
    "cognitive-complexity",
    "Cognitive complexity ratchet",
    "cognitive-complexity:check",
    "pr",
    ["node"],
    ["reports/cognitive-complexity.json", "cognitive-complexity-ratchet.json"],
    "survey-ratchet",
  ),
  gate(
    "type-coverage",
    "Non-any type coverage ratchet",
    "type-coverage:check",
    "pr",
    ["node"],
    ["reports/type-coverage.json", "type-coverage-ratchet.json"],
    "survey-ratchet",
  ),
  gate("properties", "Property-based protocol tests", "test:properties", "pr", [
    "node",
  ]),
  // The three below ran on every PR as hand-written CI jobs long before they
  // were gates. That gave them two of the three surfaces a check needs: they
  // ran locally and they ran in CI, but their result never reached `/results/`,
  // so there was no way to ask the published site whether the fuzzers had ever
  // found anything or whether the proofs still held. Registering them is what
  // publishes them; the checks themselves are unchanged.
  gate("fuzz", "Malformed-input fuzz tests", "test:fuzz", "pr", ["node"]),
  // The fuzzers above assert only that our decoders do not throw, which a
  // decoder returning null for every byte string on earth satisfies. This one
  // has an oracle: the pinned Python reference the whole project exists to be
  // compatible with. It is registered rather than left behind `INTEROP=1`
  // because a check that runs only in CI is precisely how `web-examples` stayed
  // red for 40+ runs — and unlike the interop suite it needs no live peers or
  // network namespaces, just one container reading stdin, which is the same
  // class of dependency as `chromium`.
  gate(
    "differential-fuzz",
    "Differential fuzz against the pinned reference",
    "test:differential-fuzz",
    "pr",
    ["node", "docker"],
    [
      "artifacts/differential-fuzz/differential-fuzz.json",
      "conformance/vectors/differential-allowances.json",
    ],
    "differential-fuzz",
  ),
  // Registered for the same reason, after proving the cost of not registering
  // it: `test:web-examples` ran only as a step in the hand-written `web` job
  // and stayed red for 40+ consecutive runs without ever appearing on
  // `/results/`. A job that can fail indefinitely and still leave the published
  // site reporting "Overall: pass" is precisely the greenwashing the registry
  // exists to prevent, so the browser surface now has a gate.
  //
  // Only this harness is registered, not all fourteen in the `web` job: each
  // gate becomes its own CI job with its own npm ci and browser download, and
  // paying that fourteen times over needs its own decision. This one earns it
  // by having demonstrated the failure mode.
  gate(
    "web-examples",
    "Browser example apps",
    "test:web-examples",
    "pr",
    ["node", "chromium"],
    ["artifacts/web-examples/web-examples.json"],
    "web-examples",
  ),
  // The first accessibility check in the repository. It scans the Handbook
  // reader — rendered from its real widget tree through react-native-web, the
  // same way the documentation screenshots are captured — and the desktop
  // host's shipped renderer shell. Deliberately *not* the fourteen
  // `conformance/web-*` harnesses: their pages are a `<script>` tag in an empty
  // body, so axe there would report on nothing.
  gate(
    "accessibility",
    "Accessibility ratchet",
    "a11y:check",
    "pr",
    ["node", "chromium"],
    [
      "artifacts/accessibility/accessibility.json",
      "accessibility-ratchet.json",
    ],
    "accessibility",
  ),
  gate(
    "formal",
    "Formal machine conformance and model checking",
    "test:formal",
    "pr",
    // TLC needs a JVM. `formal/README.md` deliberately keeps the executable
    // conformance check runnable without one, and `npm run formal:all` still
    // is — this gate is the all-three-stages version, so it declares the JVM
    // and skips locally when there is none, like every other tool gate.
    ["node", "jvm"],
    ["artifacts/formal/formal.json"],
    "formal",
  ),
  gate(
    "sim-fixed-replay",
    "Fixed simulation replay",
    "test:sim-fixed-replay",
    "pr",
    ["node"],
    ["conformance/sim-campaign/artifacts/fixed-replay.json"],
  ),
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
  // Native unit tests. Until 2026-08-15 the Rust and Swift suites below were
  // committed but never executed by anything — the language gates run analyzers
  // only, which is style and soundness, not behaviour. The Android suite did
  // run, but only from a workflow_dispatch lab workflow that no change
  // triggers. Nothing here is ratcheted: a failing test is a failing test.
  gate(
    "rust-tests",
    "Rust contract unit tests",
    "test:rust",
    "pr",
    ["rust"],
    ["artifacts/languages/rust-tests.json"],
    "native-tests",
  ),
  gate(
    "swift-tests",
    "Swift bridge unit tests",
    "test:swift",
    "pr",
    ["macos", "swift"],
    ["artifacts/languages/swift-tests.json"],
    "native-tests",
    "macos-15",
  ),
  // Nightly rather than PR: the Expo prebuild plus a cold Gradle run is minutes,
  // not seconds, and unlike Rust and Swift these tests were at least reachable
  // before. Moving them onto a schedule that actually fires is the win here.
  gate(
    "kotlin-tests",
    "Android bridge unit tests",
    "test:kotlin",
    "nightly",
    ["jvm", "android-sdk"],
    ["artifacts/languages/kotlin-tests.json"],
    "native-tests",
  ),
  // Nightly rather than PR, for the same reason `kotlin-tests` is: installing a
  // second Rust toolchain and building three sanitizer-instrumented binaries is
  // minutes, and a fuzzing session that finds anything needs more than a PR's
  // patience. What protects a pull request is the corpus-replay test inside each
  // contract — every input a session ever committed, replayed on the stable
  // compiler `rust-tests` already runs.
  gate(
    "rust-fuzz",
    "Freenet contract fuzzing",
    "fuzz:rust",
    "nightly",
    ["rust", "rust-nightly", "cargo-fuzz"],
    ["artifacts/rust-fuzz/rust-fuzz.json"],
    "rust-fuzz",
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
  // Nightly, because throughput measured on a shared PR runner alongside other
  // jobs is noise. What this gate ratchets is the *reference* — nothing stopped
  // `record-benchmark.mjs` from overwriting a baseline with whatever a slow
  // machine measured, leaving a permanently green, permanently meaningless
  // check. The measurement itself keeps a wide failure threshold and a warn
  // band, for the reason in `benchmark-rules.json`.
  gate(
    "benchmark",
    "Crypto benchmark drift",
    "benchmark:check",
    "nightly",
    ["node"],
    [
      "artifacts/benchmark/benchmark.json",
      "conformance/bare-runtime/baseline-node.json",
      "conformance/bare-runtime/baseline-bare.json",
    ],
    "benchmark",
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
