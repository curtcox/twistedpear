/**
 * Gates that run a toolchain other than Node: Rust, Swift, Kotlin, Python, and
 * shell.
 *
 * Split out of `registry.mjs` when four new gates pushed that file past the
 * script size threshold. This is the seam the thresholds are meant to prompt:
 * every gate here needs an external toolchain, which is also what decides
 * whether it can run on a given machine at all.
 *
 * `registry.mjs` remains the place gates are declared and the list CI expands.
 * Note that `scripts/release/status.mjs` reads that file as *text* to confirm
 * three commands are wired — `test:release-harness`, `test:hostile-apps`, and
 * `test:sim-fixed-replay` — so those three must stay declared there rather than
 * move into a module like this one.
 */
import { gate } from "./gate.mjs";

export const languageGates = [
  gate(
    "rust",
    "Rust clippy, fmt, and deny",
    "lint:rust",
    "pr",
    ["rust", "cargo-deny"],
    ["artifacts/languages/rust.json"],
  ),
  // `rust` above runs clippy with `-D warnings`, but only over clippy's default
  // groups — and `indexing_slicing`, `arithmetic_side_effects`, and the cast
  // lints all live in `restriction`/`pedantic`, which are off. That left the
  // three shipped contracts checked by nothing beyond ordinary clippy: the code
  // peers agree on, the target of the fuzzing gate, and the one place here where
  // a panic aborts a node's contract execution instead of failing a test.
  //
  // Split from `rust` rather than folded into it because that gate is
  // zero-tolerance and has to stay one. These lints have 56 findings today,
  // and a `-D warnings` gate cannot carry a backlog without becoming a list of
  // allowed failures. The lints that already hold at zero — `unwrap_used`,
  // `expect_used`, `panic`, `unreachable`, `todo` — are not here at all: they
  // are denied in each contract's Cargo.toml, where `rust` enforces them free.
  gate(
    "rust-lints",
    "Rust contract restriction lints",
    "rust-lints:check",
    "pr",
    ["rust"],
    [
      "language-ratchets/rust-lints.json",
      "artifacts/checks/rust-lints-detail.json",
    ],
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
  // `rust-tests` above proves the tests pass. It cannot say how much they
  // touch, and `cargo test` reports "ok" for a suite that has been annotated
  // out: adding `#[ignore]` to the locator contract's only test drops it from
  // 77.3% to 52.6% lines while that gate stays green. The coverage ratchet
  // covers `packages/*` and `apps/*` — TypeScript only — so the three Freenet
  // contracts, the code peers have to agree on, were the least measured in the
  // repository.
  gate(
    "rust-coverage",
    "Rust coverage ratchet",
    "coverage:rust",
    "pr",
    ["rust", "cargo-llvm-cov"],
    [
      "artifacts/languages/rust-coverage.json",
      "language-ratchets/rust-coverage.json",
    ],
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
  gate(
    "swift-coverage",
    "Swift coverage ratchet",
    "coverage:swift",
    "pr",
    ["macos", "swift"],
    [
      "artifacts/languages/swift-coverage.json",
      "language-ratchets/swift-coverage.json",
    ],
    "generic",
    "macos-15",
  ),
  gate(
    "kotlin-tests",
    "Android bridge unit tests",
    "test:kotlin",
    "pr",
    ["jvm", "android-sdk"],
    ["artifacts/languages/kotlin-tests.json"],
    "native-tests",
  ),
  gate(
    "kotlin-coverage",
    "Kotlin coverage ratchet",
    "coverage:kotlin",
    "pr",
    ["jvm", "android-sdk"],
    [
      "artifacts/languages/kotlin-coverage.json",
      "language-ratchets/kotlin-coverage.json",
    ],
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
];
