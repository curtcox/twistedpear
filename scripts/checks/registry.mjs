/**
 * The static-analysis gates, and the single list CI expands into its matrix.
 *
 * The gate record shape and the scheduling policy live in `./gate.mjs`; the
 * gates needing a non-Node toolchain live in `./gates-languages.mjs`. Both are
 * re-exported here, so this module stays the one import every consumer uses.
 *
 * `scripts/release/status.mjs` reads this file as *text* to confirm that
 * `test:release-harness`, `test:hostile-apps`, and `test:sim-fixed-replay` are
 * wired. Those three must therefore stay declared in this file rather than move
 * into a gate module.
 */
import {
  deferredOnPages,
  gate,
  gateRequiresJvm,
  isOffPagesBuild,
  prebuildPrGates,
} from "./gate.mjs";
import { languageGates } from "./gates-languages.mjs";

export { deferredOnPages, gateRequiresJvm, isOffPagesBuild, prebuildPrGates };

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
  // Strictness parity between workspaces. `typecheck` above proves each project
  // passes under its own flags; this one proves the flags are the same ones. It
  // was added after finding that `sim-adversaries` had lost two strictness
  // options and `harness-mobile` five — all of them green, because an absent
  // flag never fails.
  gate(
    "tsconfig-parity",
    "TypeScript strictness parity",
    "tsconfig:check",
    "pr",
    ["node"],
    ["tsconfig.base.json", "tsconfig.package.json"],
  ),
  gate("unit-tests", "Unit tests", "test:unit", "pr", ["node"]),
  gate(
    "guida-parity",
    "Guida/JS widget-stream parity",
    "test:guida-parity",
    "pr",
    ["node", "guida"],
  ),
  // `swift-tests`, `kotlin-tests` and `unit-tests` each check one language's
  // copy of the BLE spec against itself, and all three pass. Nothing compared
  // the copies, and they are typed by hand: four GATT UUIDs in Swift and
  // Kotlin, the default ATT MTU in five places across four files. A transposed
  // digit is green in every gate here and surfaces as an iPhone that cannot see
  // an Android device — hardware-gated work that reads as a radio fault rather
  // than a typo. Node-only and textual on purpose: needing Xcode and Gradle to
  // compare two numbers is what kept this from running everywhere.
  gate(
    "native-parity",
    "Cross-language native bridge parity",
    "native-parity:check",
    "pr",
    ["node"],
    [
      "conformance/native-parity/ble-bridge.json",
      "artifacts/checks/native-parity-detail.json",
    ],
  ),
  gate(
    "file-sizes",
    "File-size ratchet",
    "sizes",
    "pr",
    ["node"],
    ["file-sizes.json"],
  ),
  // `file-sizes` above measures authored source, and exempts `**/*.bundle`,
  // `**/*.bundle.mjs` and `**/*.generated.mjs` — correctly, since a bundle
  // cannot be decomposed by editing it. `generated-freshness` proves those
  // bundles are current. Neither asks how big they are, so the two largest
  // files in the repository, 11.4 MB and 10.9 MB of shipped host runtime, were
  // measured by nothing at all. On a platform that distributes over Reticulum
  // and installs onto phones, shipped bytes are a user-visible property.
  //
  // A budget rather than a ratchet: bundles legitimately grow, and a monotonic
  // floor would fail on every honest change and be routed around, exactly as a
  // benchmark floor pinned to the best-ever measurement would.
  gate(
    "artifact-sizes",
    "Shipped artifact byte budgets",
    "artifact-sizes:check",
    "pr",
    ["node"],
    ["artifact-size-rules.json", "artifacts/checks/artifact-sizes-detail.json"],
  ),
  gate("release-harness", "Release harness", "test:release-harness", "pr", [
    "node",
  ]),
  gate("doc-audit", "Documentation audit", "test:doc-audit", "pr", ["node"]),
  // `doc-audit` resolves every markdown link in the tree. A citation written as
  // an inline code span is not a link, and that is the form the specs use for
  // vector keys, test titles, and commands — so deleting a vector key or
  // renaming a test silently un-pins a normative claim. SPEC-WIRE states the
  // rule this enforces in its own prose: a profile is done when every subset row
  // cites a pinned vector or interop test. Nothing checked it, and the first
  // complete run found two rows citing tests that do not exist.
  gate(
    "spec-traceability",
    "Specification evidence traceability",
    "spec-traceability:check",
    "pr",
    ["node"],
    [
      "spec-traceability-waivers.json",
      "artifacts/checks/spec-traceability-detail.json",
    ],
  ),
  // `doc-audit` is structure (headers, counterparts, repo links). This one is
  // the generated GitHub Pages tree: real screenshots, not hatch placeholders.
  gate(
    "site-pages",
    "GitHub Pages site integrity",
    "site:verify",
    "pr",
    ["node"],
    ["artifacts/site-pages.json"],
    "site-pages",
  ),
  // `doc-audit` checks everything about these files except what they say.
  // Lifecycle metadata, counterpart links, every link and image resolving — all
  // structure, none of it reading a sentence. The user guide, authoring guide,
  // cookbook, specs and docs tree are what a reader meets before any code, and
  // a typo there fails no build, which is why nothing had caught one.
  gate(
    "spelling",
    "Prose spelling",
    "spelling:check",
    "pr",
    ["node"],
    ["project-words.txt"],
  ),
  gate(
    "sim-authored-replay",
    "Authored simulation replay",
    "test:sim-authored-replay",
    "pr",
    ["node"],
  ),
  // The wire formats are covered from four directions — golden vectors,
  // properties, fuzzing, differential fuzzing against a pinned reference. The
  // formats *at rest* had none of it. Every existing test of the two migration
  // paths encodes with today's encoder and decodes with today's decoder, which
  // passes just as happily after a breaking change to both halves. This one
  // starts from committed bytes an older build left behind. On a local-first
  // platform a store that silently fails to load is not a bug report; it is a
  // person whose identity is gone.
  gate(
    "state-migration",
    "On-disk store compatibility",
    "test:state-migration",
    "pr",
    ["node"],
    ["conformance/state-migration/fixtures/expected.json"],
  ),
  gate("actionlint", "GitHub Actions lint", "actionlint", "pr", ["actionlint"]),
  // `actionlint` above validates workflow syntax and expressions; it says
  // nothing about supply-chain posture. Until 2026-08-15 all 226 `uses:`
  // references were moving tags — a standing write grant to whoever can push
  // one — in a repository that otherwise verifies a code-maat jar against a
  // SHA-256 digest and reconciles every advisory against an allowlist. Offline
  // and shape-only on purpose: a gate that needs the network to say "unchanged"
  // fails when GitHub does.
  gate(
    "actions-pinned",
    "GitHub Actions pinned to commit SHAs",
    "actions:check",
    "pr",
    ["node"],
  ),
  gate(
    "coverage",
    "Coverage ratchet",
    "coverage:check",
    "pr",
    ["node"],
    [
      "coverage/coverage-summary.json",
      "coverage/coverage-final.json",
      "coverage-ratchet.json",
    ],
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
  gate(
    "api-signatures",
    "Public API signature compatibility",
    "api-signatures:check",
    "pr",
    ["node"],
    ["reports/api", "api-signatures-policy.json"],
  ),
  gate(
    "generated-freshness",
    "Committed generated artifact freshness",
    "generated:check",
    "pr",
    ["node"],
    ["artifacts/generated-freshness.json"],
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
  // The three above bound taste. This one bounds defects: its rules find a
  // request with no deadline, an error caught and dropped, a retry with nothing
  // making it safe to repeat, a case fold under the user's locale. None is a
  // type error, none is a lint violation, and all of them work on a laptop and
  // fail in the field — which made it the one defect-class measurement here
  // that could grow indefinitely with every gate green. 94 of the 134
  // baselined findings are empty catch blocks.
  gate(
    "ast-grep",
    "Structural reliability ratchet",
    "ast-grep:check",
    "pr",
    ["node"],
    ["reports/ast-grep.json", "ast-grep-ratchet.json"],
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
  gate(
    "web-cross-browser",
    "Web examples in Firefox and WebKit",
    "test:web-examples:cross-browser",
    "pr",
    ["node", "firefox", "webkit"],
    [
      "artifacts/web-examples/web-examples-firefox.json",
      "artifacts/web-examples/web-examples-webkit.json",
    ],
    "web-examples",
  ),
  gate(
    "ui-invariants",
    "Trust UI behavioral invariants",
    "test:ui-invariants",
    "pr",
    ["node", "chromium"],
    ["artifacts/ui-invariants/ui-invariants.json"],
  ),
  gate(
    "visual-regression",
    "Critical desktop visual regression",
    "visual:check",
    "pr",
    ["node", "chromium", "pinned-macos-runner"],
    ["artifacts/visual-regression.json", "artifacts/visual-regression"],
    "generic",
    "macos-15",
  ),
  // The first accessibility check in the repository. It scans the Handbook
  // reader — rendered from its real widget tree through react-native-web, the
  // same way the documentation screenshots are captured — and the desktop
  // host's shipped renderer, capability review, and grants state. Deliberately *not* the fourteen
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
  // `advisories` asks whether a dependency is known-vulnerable and `licenses`
  // whether its terms are acceptable. Neither asks whether it runs code on the
  // way in. `npm ci` executed install scripts from the whole transitive tree,
  // with full privileges, before any gate here had run — the one supply-chain
  // door still open next to SHA-pinned Actions and verified registry
  // signatures. `.npmrc` now sets ignore-scripts=true; this gate is what keeps
  // that true and makes a newly-appearing install script something a person has
  // to read.
  gate(
    "install-scripts",
    "Dependency install-script policy",
    "install-scripts:check",
    "pr",
    ["node"],
    ["install-scripts-allowlist.json"],
  ),
  ...languageGates,
  // Whether the tests can be trusted, rather than whether the code is right.
  // Nothing measured this: `vitest.config.ts` sets no retry and no repeats, and
  // nothing reran a suite to compare, so a test passing 90% of the time was
  // indistinguishable from a passing one and flakes surfaced as random red CI
  // that someone re-ran by hand. Nightly because the honest form of this check
  // is running the whole suite several times, and the PR tier already pays for
  // it once.
  gate(
    "flake",
    "Unit-suite flake detection",
    "flake:check",
    "nightly",
    ["node"],
    ["artifacts/flake/flake.json", "flake-ratchet.json"],
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
  // End-to-end performance. The `benchmark` gate above covers crypto
  // primitives; nothing covered the paths a user actually waits on. Both of
  // these runners existed and had a threshold, and neither was reachable by any
  // schedule — `test:link-benchmark` compared against a baseline file of all
  // zeros behind `if (baseline.setupP95Ms > 0)`, so for over a month it
  // measured, printed, and asserted nothing. A 3x regression in link setup or
  // mini-app spawn passed every gate in the repository.
  gate(
    "link-benchmark",
    "Link handshake latency drift",
    "test:link-benchmark",
    "nightly",
    ["node", "docker"],
    [
      "artifacts/benchmark/link-benchmark.json",
      "conformance/link-benchmark/measured.json",
    ],
    "benchmark",
  ),
  gate(
    "miniapp-benchmark",
    "Mini-app spawn and watchdog drift",
    "test:miniapp-benchmark",
    "nightly",
    ["node"],
    [
      "artifacts/benchmark/miniapp-benchmark.json",
      "conformance/miniapp-benchmark/measured-desktop.json",
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
  // The SBOM above records what was installed; it does not attest to it.
  // `audit` and `advisories` ask whether a dependency is known-vulnerable and
  // `licenses` whether its terms are acceptable — none of them ask whether the
  // tarball is the one the registry published, which is what catches a tampered
  // mirror or a poisoned cache. Nightly rather than PR because it needs the
  // network and takes about twelve seconds over 1500 packages.
  gate(
    "provenance",
    "Dependency registry signatures",
    "provenance:check",
    "nightly",
    ["node", "network"],
    ["artifacts/security/provenance.json"],
  ),
  gate(
    "codeql-alerts",
    "Open CodeQL alert ratchet",
    "codeql:check",
    "nightly",
    ["node", "network"],
    ["artifacts/security/codeql-alerts.json", "codeql-ratchet.json"],
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

export function gateById(id) {
  return gates.find((candidate) => candidate.id === id);
}
