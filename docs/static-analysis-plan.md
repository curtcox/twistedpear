# Static analysis remaining activation plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-05
register: none
counterpart: docs/static-analysis.md
-->

**This is a plan, not a description of current behaviour.** The implemented gate
registry, commands, baselines, CI matrices, and reports are described in
[Static analysis](static-analysis.md). That live document wins if the two disagree.

The enforceable infrastructure and local follow-up work from the original nine phases
has landed. The property inventory is complete, the formatting ratchet is empty, and the
mechanical formatting commit is listed in `.git-blame-ignore-revs`. The remaining work is
limited to evidence from workflows that have not run against this checkout and the
repository setting that depends on that evidence.

## Repository-setting activation

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

These operations require repository administration and intentionally have no script that
attempts to mutate settings from an ordinary local validation run.

The first language-runner survey is complete: Rust, shell, Python, Kotlin, Swift, and
Actions each uploaded a successful result from its pinned tool. The first dashboard also
updated its sticky comment, but exposed an aggregation defect: four gates that stopped in
a shared build step were absent from the summary. This checkout fixes that omission; the
next external run is the required proof.
