# Mutation testing

<!-- tp-doc
lifecycle: live
audited: 2026-08-16
register: none
-->

Coverage says a line executed. Mutation says whether anything would have noticed it
change. This document covers the nightly `mutation` gate and the cheap `mutation-policy`
PR gate that guards its floors; the rest of the analysis gates are in
[static analysis](static-analysis.md).

Nightly Stryker analysis covers nine packages. It measures all authored sources in
`protocol`, `effects`, `reticulum-ts`, `lxmf-ts`, `cas-256t`, and `host-core`, plus the
authority, authentication, replay, policy, sandbox, and framing seams in
`miniapp-runtime`, `peer-discovery`, and `reticulum-interfaces`. It ignores static mutants
that would exceed the CI time budget. Each package runs as an isolated shard with only its
package and related conformance tests loaded; the gate merges the nine reports into
`reports/mutation/mutation.json`. This avoids loading the entire native-backed test suite
inside every Stryker worker and makes a failed package attributable. `mutation-ratchet.json`
holds one floor per mutated package plus the combined figure, and the cheap
`mutation-policy` PR gate prevents any of them from decreasing.

Until 2026-08-15 the list was `protocol` and `effects` alone. Everywhere else, coverage
percentage was the only signal of test quality — and coverage measures execution, not
assertion: it says a line ran, never that anything would have noticed it change. The four
packages added are where that gap mattered most. `reticulum-ts` and `lxmf-ts` are the
wire-compatible stacks, where a silently wrong byte is the entire failure mode, and
`host-core` orchestrates the host. Measuring them was not reassuring:

| Package                         | Mutation score | Coverage (statements) |
| ------------------------------- | -------------- | --------------------- |
| `packages/protocol`             | 71.70%         | 89%+                  |
| `packages/cas-256t`             | 69.51%         | 89.62%                |
| `packages/miniapp-runtime`      | 65.52%         | high                  |
| `packages/reticulum-interfaces` | 64.84%         | high                  |
| `packages/peer-discovery`       | 57.52%         | high                  |
| `packages/effects`              | 52.08%         | 80%+                  |
| `packages/lxmf-ts`              | 49.40%         | high                  |
| `packages/host-core`            | 48.52%         | high                  |
| `packages/reticulum-ts`         | 46.39%         | high                  |

Better than half of all mutations survive in the three lowest, against coverage numbers
that look healthy — which is the entire argument for measuring this at all. The survey
names the specific holes rather than just the totals: `reticulum-ts/src/msgpack.ts` scores
**0.00%** with 147 no-coverage mutants, and `transport-node-base.ts` (6.67%),
`drop-notify.ts` (6.25%), and `transport-node-path.ts` (18.96%) are close behind. Those
floors are recorded where they are so they can only rise; they are a debt register, not an
endorsement.

The three selectively covered packages also gained direct tests for sandbox dispatch,
byte-wire revival, bundle preparation, one-use security policies, discovery deadlines,
and bounded replay memory. The first mini-app survey scored 37.93% because all three
sandbox seams were untested; those tests raised the recorded package floor to 65.52%.

`MUTATION_PACKAGES=reticulum-ts,lxmf-ts` scopes a run to a subset, which is how a single
package's floor is iterated on without paying for the whole survey —
`packages/protocol` alone carries about 25 000 mutants.
`scripts/analysis/mutation-merge.mjs` unions scoped reports back into one survey report,
so a baseline can be composed from separate runs; the nightly gate now does this
automatically. It refuses inputs that mutate the same
file twice, since overlapping scopes are a mistake rather than something to resolve
silently.

### Why the combined floor fell

Widening the scope moved the combined figure from 70.06% to 62.62% without a single
package regressing. The combined figure is a mutant-weighted average, so it is a statement
about one set of packages and is not comparable across two: 13 573 new mutants scoring
around 47% against protocol's 25 040 at 71.7% moves the average by arithmetic alone.

`comparePolicy` therefore skips the combined comparison **only when the package set
differs**, and never for anything else. Failing on it would mean the ratchet punishes
measuring more of the repository, which is the opposite of its purpose; treating it as
free would let a real combined regression hide behind a scope change. Every package
present in both baselines is still held to its own floor, which is the comparison that
stays meaningful either way — and removing a package is always a failure, because dropping
the weakest one is the single edit that raises the combined figure by measuring less.

### Tolerance, and why initialising a floor is not a regression

Two further gaps surfaced while widening the scope, both of which the coverage ratchet
had already solved:

- **Mutation scores are not deterministic.** A `Timeout` counts as killed here, and how
  many mutants time out depends on machine load: two surveys of an unchanged
  `packages/protocol` measured 71.70% and 71.66%, about ten mutants out of 25 074. With
  no tolerance that is a gate going red for reasons found nowhere in the diff, so
  measurements are now compared with the same 0.5-point tolerance coverage uses. It
  applies to a measurement against a floor only — floor-against-floor comparison in
  `comparePolicy` stays exact, because a tolerance there would let someone walk a floor
  down half a point per pull request.
- **A baseline write may no longer lower a floor.** It previously recorded whatever the
  run measured, so one survey under load could walk every floor downwards — a ratchet
  that turns whichever way the noise went. Floors now take the maximum of the recorded
  and measured values, as in the coverage ratchet, and `--allow-regressions` is the
  deliberate override.

Those two interacted badly with a third problem: `compareScores` treated "mutated but has
no recorded floor" as a regression, so every scope widening needed
`--allow-regressions` — which in turn re-recorded every _existing_ floor at whatever that
run measured. Adding four packages would have quietly dropped `packages/protocol` from
71.70 to 71.66 as a side effect. Initialising a floor for a newly mutated package is now
distinguished from lowering an existing one: the gate still fails on an unfloored package,
because one could otherwise sit at zero unnoticed, but a baseline write may create the
floor and says so on stdout.

It was a single number until 2026-08-15, which is the wrong shape twice over. A package
added to `stryker.config.mjs` came in at whatever it happened to score, averaged against
the ones that already scored well, so it could sit at zero unnoticed — the gate now fails
on a mutated package with no recorded floor. And `packages/protocol` contributes 25 040 of
the 27 321 mutants, so a regression in `packages/effects` was cancelled by the weight of
the other: effects could fall from 52% to 30% and move the combined figure by under two
points, inside the noise anyone would put down to a survey rerun. Decomposing the number
showed what it had been hiding — protocol scores 71.7% and effects 52.08% against a single
recorded floor of 69.16% that effects had never met.

The combined floor is kept alongside the per-package ones rather than replaced. Per-package
floors alone would let the overall score drift down as the mix of mutants changes without
any one package regressing, so the two together are strictly stronger than either. The
comparison logic is exported and unit-tested by `conformance/checks/mutation-floors.test.mjs`,
because a ~70 minute nightly gate is otherwise exercised once a day and only on the happy
path. `npm run ratchets:rank` now names the weakest package instead of reporting the floor
as "not rankable".
