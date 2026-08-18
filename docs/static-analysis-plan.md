# Static analysis remaining activation plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-17
register: software
counterpart: docs/static-analysis.md
-->

**This is a plan, not a description of current behaviour.** The implemented gate
registry, commands, baselines, CI matrices, and reports are described in
[Static analysis](static-analysis.md). That live document wins if the two disagree.

The enforceable infrastructure, property coverage, and formatting decomposition have
landed. `format-ratchet.json` is empty and the repository is Prettier-clean under the
file-size ceiling. The remaining work is limited to external workflow evidence and the
repository setting that depends on that evidence.

## Repository-setting activation

The five steps are tracked as `SA-CI-AGGREGATE`, `SA-BRANCH-PROTECTION`,
`SA-NIGHTLY-ADVISORY`, `SA-CARGO-DEPENDABOT`, and `SA-BLAME-IGNORE` in the **blocked
backlog** of [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md), all waiting on the `repo-admin`
resource: none of them can be reached from an ordinary local validation run.

1. Push this checkout and obtain a successful aggregate CI run. Confirm its sticky PR
   dashboard and `static-analysis-summary.json` contain all 23 PR gates, including an
   explicit missing-result failure if a gate stops before its runner writes an artifact.
2. After that successful run, configure GitHub branch protection to require only
   `ci-green`. There are currently no classic branch-protection rules to replace.
3. Confirm the next nightly advisory job passes with the narrow, expiring transitive
   `vite` exception already recorded in `audit-allowlist.json`.
4. Confirm the first grouped Cargo Dependabot pull request. Grouped npm and Actions pull
   requests have already opened, and CodeQL has successfully accepted its
   JavaScript/TypeScript, Python, and Actions databases.
5. After the formatting-only commit lands, add its SHA to `.git-blame-ignore-revs`.

These operations require repository administration and intentionally have no script that
attempts to mutate settings from an ordinary local validation run.
