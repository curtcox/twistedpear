# Static analysis remaining activation plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-02
register: none
counterpart: docs/static-analysis.md
-->

**This is a plan, not a description of current behaviour.** The implemented gate
registry, commands, baselines, CI matrices, and reports are described in
[Static analysis](static-analysis.md). That live document wins if the two disagree.

The enforceable infrastructure from the original nine phases has landed in repository
code. The remaining work is repository activation and first-run evidence that cannot be
truthfully recorded as complete in this checkout, plus incremental property and baseline
tightening.

## Repository-setting activation

1. In GitHub branch protection, require only `ci-green`; remove the old individually
   enumerated required checks after the first successful run demonstrates aggregation.
2. Confirm Dependabot opened grouped weekly npm, Actions, and Cargo updates and that
   CodeQL accepted JavaScript/TypeScript, Python, and Actions databases.

These operations require repository administration and intentionally have no script that
attempts to mutate settings from an ordinary local validation run.

## First external surveys

| Survey | Command / evidence | Completion |
|---|---|---|
| npm advisories | `npm run audit:baseline -- --allow-regressions`, after explicitly approving disclosure of dependency metadata to the npm registry | Every temporary high/critical exception has a reason and expiry; the next `audit:nightly` passes |
| language runners | First PR touching each language | Rust, shell, Python, Kotlin, Swift, and Actions artifacts are uploaded from their pinned CI tools |
| PR dashboard | First pull request after landing | One sticky comment is updated and `static-analysis-summary.json` contains all PR gates |

## Follow-up tightening

The initial repository-wide lint, typed-lint, complexity, formatting, Knip, and license
baselines grandfather existing findings so this change remains reviewable. They may only
shrink. Follow-up work should use the matching `:baseline` command after fixes and must
not pass `--allow-regressions`.

The property gate currently covers HDLC, PKCS#7, msgpack float64, and executable
link/resource traces. Extend it with the remaining codec pairs and invariants named by
the original survey as those modules change. Any minimized failure becomes a committed
vector under `conformance/vectors/` before the fix lands.

Formatting should eventually reach an empty `format-ratchet.json`. Perform the mechanical
Prettier rewrite in a formatting-only commit and add that commit to
`.git-blame-ignore-revs`; do not mix the rewrite with behavior changes.
