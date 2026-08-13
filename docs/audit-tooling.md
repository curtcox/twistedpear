# Audit tooling — the survey

<!-- tp-doc
lifecycle: live
audited: 2026-08-13
register: none
counterpart: docs/static-analysis.md
-->

The **survey** is a set of open-source analysis tools that measure the code and
write machine-readable reports. It is not a gate.

That distinction is the whole design. Everything in
[Static analysis](static-analysis.md) is a ratchet or a hard threshold: it fails
CI, it blocks a merge, and its baseline is a debt register that may only shrink.
The survey does none of that. It runs every tool to completion, writes JSON
under `reports/`, and exits zero whatever the numbers say. Trending, thresholds,
and any policy built on this data belong to the external system that consumes
the reports — which is why survey tools are deliberately **not** registered in
`scripts/checks/registry.mjs`, and why `ci-green` does not depend on them.

## Running it

```bash
npm run survey
```

About 95 seconds on a warm checkout, plus `npm run build` if `dist/` is stale.
Every tool is also runnable alone:

```bash
npm run survey:knip
```

`survey:jscpd`, `survey:cognitive-complexity`, `survey:type-coverage`,
`survey:dependency-cruiser`, `survey:api-extractor`, `survey:code-maat`, and
`survey:ast-grep` work the same way. A single-tool run rewrites only that tool's
report and merges its entry into the existing manifest, so it never makes the
other seven look like they stopped being measured.

`npm run survey:summary` prints the manifest as a table. Add `--strict` to
`node scripts/survey/run.mjs` to exit non-zero when a tool errored; nothing in
CI uses it, and no amount of findings ever causes it.

## What each tool measures

| Tool                   | Question it answers                                                          | Report                                                |
| ---------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| `knip`                 | What surface exists that nothing reaches?                                    | `reports/knip.json`                                   |
| `jscpd`                | What code exists in more than one place?                                     | `reports/jscpd.json`                                  |
| `cognitive-complexity` | Which functions are hard to hold in your head?                               | `reports/cognitive-complexity.json`                   |
| `type-coverage`        | How much of the code is actually typed, rather than `any`?                   | `reports/type-coverage.json`                          |
| `dependency-cruiser`   | Where does the import graph disagree with the intended layering?             | `reports/dependency-cruiser.json`                     |
| `api-extractor`        | Has any package's exported contract changed shape?                           | `reports/api-extractor.json` + `reports/api/*.api.md` |
| `code-maat`            | Which files change together without importing each other?                    | `reports/code-maat.json`                              |
| `ast-grep`             | Where do the I/O boundaries lack timeouts, error handling, or locale safety? | `reports/ast-grep.json`                               |

`reports/manifest.json` is written last and is what an external consumer should
read first: commit SHA, branch, timestamp, Node version, platform, and per-tool
status, version, output path, byte count, finding count, and duration. A tool
that failed appears there with its error message, and its report file contains
the same error rather than being absent.

### Notes that change how the numbers read

- **`cognitive-complexity` measures something the `complexity` gate does not.**
  ESLint's `complexity` rule is cyclomatic — one point per branch, nesting-free.
  Cognitive complexity charges nesting progressively and forgives structures
  that read linearly. A flat twenty-arm switch is cyclomatically awful and
  cognitively fine; a triple-nested conditional is the reverse. The threshold in
  `eslint.survey.config.js` is 0 so that every function reports its score.
  Functions scoring 0 are absent by construction — there is no threshold below
  zero — so `functionsScored` counts what was measured, not what exists.
- **`jscpd` excludes test files.** Tests duplicate by nature and would dominate
  the pair list. Remove the `**/*.test.*` entries from `.jscpd.json` to include
  them. `fragment` — the duplicated source text — is dropped from the report; it
  is the bulk of jscpd's own output and the least stable part of it.
- **`dependency-cruiser` reuses `.dependency-cruiser.cjs`.** The layering rules
  are not redefined here; that file already encodes Sans-IO purity, the
  protocol/adapter direction, and the no-cycles rule, and it is what the
  `structure` and `coupling` gates measure against. The survey cruises a wider
  set of roots than the gate does (`scripts`, `conformance`, and `formal` as
  well), so its violation count is legitimately higher. The `severity` field is
  passed through as dependency-cruiser labels it and means nothing here.
- **`api-extractor` needs a build.** It reads `dist/*.d.ts`. Each subpath in a
  package's `exports` map is reported separately, because a consumer importing
  `@twistedpear/reticulum-ts/web` sees a different contract from one importing
  the root. `packages/worklet-core` is reported as skipped: it ships `.mjs`
  directly and has no `tsconfig.json`. The `.api.md` files under `reports/api/`
  are the diffable artifact; the doc model is not generated because it runs to
  about 10 MB per package and is no more diffable than the report.
- **`code-maat` needs a JVM and real history.** It downloads a pinned
  code-maat 1.0.4 jar to `.tmp/code-maat/`, verified against a SHA-256 digest,
  and refuses anything else. A shallow clone produces a near-empty table rather
  than an error, so `summary.shallow` reports whether the checkout was shallow.
  Findings are classified: `testPair` (a module and its own test — working as
  intended), `importRelated` (they change together and one imports the other —
  expected), and `unexplained`, which is the finding worth reading. This is the
  only tool here that can see coupling with no structural trace at all.
- **`ast-grep` rules are scoped away from what ESLint already covers.** The
  timezone rules skip the protocol packages, where `eslint.config.js` forbids
  `new Date()` and `Date.now()` outright. Rules that matched nothing still
  appear in `summary.byRule` with a count of 0 — an absent rule and a clean rule
  otherwise look identical, and only one of them is good news.

### Findings are anchored on symbols, not lines

`cognitive-complexity` and `ast-grep` resolve every finding to a symbol path
(`Link.establish`, `createPeerSession > ntfyHostFetch > get`) alongside the line
number, using `scripts/survey/anchors.mjs`. Reformat a file and the line numbers
all move; the symbol paths do not. `knip`, `dependency-cruiser`, `code-maat`,
and `api-extractor` are keyed on module paths and symbol names natively.

## In CI

`.github/workflows/survey.yml` runs on push to `main` and on
`workflow_dispatch`. It checks out with `fetch-depth: 0` for code-maat, installs
Temurin 17 for the same reason, builds the workspace for api-extractor, runs
`npm run survey`, writes the manifest table to the step summary, and uploads
`reports/` as the `survey-reports` artifact with 90-day retention.

The job never fails on findings. It fails only if checkout, Node setup, or
`npm ci` breaks — that is, if the runner itself is broken. An individual tool
crashing is recorded in the manifest and the workflow stays green.

`reports/` is gitignored.

## Adding an ast-grep rule

Rules live in `ast-grep-rules/`, one YAML file per concern, several documents
per file separated by `---`. `sgconfig.yml` points at the directory; a new file
needs no registration.

A rule is:

```yaml
id: my-rule-name
language: TypeScript
severity: hint
message: One sentence saying what will go wrong, not what the pattern is.
rule:
  pattern: fetch($$$ARGS)
  not:
    has:
      stopBy: end
      pattern: signal
```

Three things are worth knowing before you write one:

1. **One language per rule.** ast-grep binds a rule to a single language, so a
   rule that should cover `.ts`, `.tsx`, and `.mjs` is written three times with
   `-tsx` and `-js` suffixes on the id. The survey strips those suffixes and
   reports them as one rule, so the duplication stays out of the report.
2. **A pattern must be one complete AST node.** `catch ($E) { … }` will not
   parse on its own; write `try { $$$BODY } catch ($E) { … }`.
3. **Scope away from existing coverage.** Use `ignores` with path globs where an
   ESLint rule already reports the same thing. Two tools reporting one line
   makes both of them worth less.

Then verify it, in this order:

```bash
node_modules/.bin/ast-grep scan --json=compact | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const b={};for(const m of JSON.parse(s))b[m.ruleId]=(b[m.ruleId]??0)+1;console.log(b)})"
```

**If your rule reports zero, prove it can report anything at all.** Write a file
containing the thing you are looking for, scan that file specifically, and check
the rule fires. A rule with a typo in its pattern and a rule with nothing to
find produce identical output, and the difference matters:

```bash
mkdir -p .tmp/agprobe && cat > .tmp/agprobe/probe.ts <<'EOF'
export const x = fetch("https://example.test");
EOF
node_modules/.bin/ast-grep scan .tmp/agprobe/probe.ts --json=compact
rm -rf .tmp/agprobe
```

Finally run `npm run survey:ast-grep` and confirm the rule appears in
`summary.byRule`.

## Tools considered and not adopted

| Tool                                                  | Why not                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ts-prune`                                            | In maintenance mode, and knip covers it.                                                                                                                                                                                                                                                                                                                |
| `madge`                                               | Cycles only, which `dependency-cruiser` already reports; its peer range also wants TypeScript ^5.4.4 against this repo's 6.0.2.                                                                                                                                                                                                                         |
| `code-complexity`                                     | Churn × size, which the existing nightly `hotspots` gate already computes — with real complexity rather than file size.                                                                                                                                                                                                                                 |
| `similarity-ts`                                       | The canonical implementation is a Rust crate, not on npm. The only npm package under that name is a third-party republish from a different owner than the upstream project. Adding a Rust toolchain to this workflow was declined; revisit by vendoring `cargo install --locked similarity-ts` if structural near-duplicate detection becomes worth it. |
| `semgrep` (OSS)                                       | CodeQL already runs taint analysis on JavaScript/TypeScript nightly here, and `ast-grep` expresses the structural rules wanted so far without a Python toolchain.                                                                                                                                                                                       |
| `eslint-plugin-sonarjs` (beyond cognitive complexity) | Only `sonarjs/cognitive-complexity` is enabled. Its other rules overlap the existing `lint`, `lint-all`, and `typed-lint` gates, and a second report of the same finding makes both less useful.                                                                                                                                                        |
| `typescript-eslint` type-aware rules                  | Already present. `eslint.typed.config.js` runs `no-floating-promises`, `no-misused-promises`, `await-thenable`, `require-await`, and `no-unnecessary-condition` under the ratcheted `typed-lint` gate.                                                                                                                                                  |
