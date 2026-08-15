# Complexity gates

<!-- tp-doc
lifecycle: live
audited: 2026-08-14
register: none
-->

Four gates that measure dimensions of complexity the rest of the pipeline does not:
local complexity outside TypeScript, global graph coupling, public interface size, and
churn-weighted hotspots. Companion to [Static analysis](static-analysis.md) and
[CI policy](ci-policy.md).

## What each gate measures

| Gate                   | Command                        | Tier    | Config                            | Report                      |
| ---------------------- | ------------------------------ | ------- | --------------------------------- | --------------------------- |
| `complexity-multilang` | `npm run complexity:multilang` | PR      | `complexity-multilang-rules.json` | `complexity-multilang.json` |
| `coupling`             | `npm run coupling:check`       | PR      | `coupling-rules.json`             | `coupling.json`             |
| `api-surface`          | `npm run api:check`            | PR      | `api-surface-limits.json`         | `api-surface.json`          |
| `hotspots`             | `npm run hotspots`             | Nightly | (none)                            | `hotspots.json`             |

### `complexity-multilang` — function complexity outside TypeScript

`eslint.complexity.config.js` matches `**/*.{ts,tsx}` only. That leaves roughly six
thousand authored functions in `.mjs`, `.js`, `.py`, `.kt` and `.swift` with no
complexity limit at all — including the desktop and mobile worklet entry points, which
are among the most intricate code in the repository.

This gate drives [lizard](https://github.com/terryyin/lizard) over
`packages apps conformance scripts formal launcher.py` and caps cyclomatic complexity,
parameter count and non-comment line count per function. Thresholds mirror
`complexity-rules.json` so that a function does not become acceptable by being written
in `.mjs` instead of `.ts`:

| Tier      | Applies to                                                                   | CCN | Params | NLOC |
| --------- | ---------------------------------------------------------------------------- | --- | ------ | ---- |
| `tooling` | `scripts/`, `conformance/`, `formal/`, `*.config.{js,mjs,cjs}`, `build*.mjs` | 15  | 8      | 200  |
| `test`    | `test/` directories, `*.test.{js,mjs,cjs}`                                   | 15  | 8      | 200  |
| `source`  | everything else                                                              | 10  | 5      | 120  |

TypeScript is deliberately **not** in the language list. ESLint already owns `.ts` and
`.tsx`, and double-gating would create two debt lists for the same functions that could
drift apart.

### `coupling` — module and component structure

`structure:check` cruises `packages apps` for cycles, orphans and dependency types. It
does not look at `scripts/` or `conformance/` at all, and it measures no graph metrics.
This gate reuses `.dependency-cruiser.cjs` over `packages apps scripts conformance` and
enforces:

- **fan-out** — at most 15 outgoing edges per module, 40 for a declared barrel
  (`index.*`, `lib.mjs`, `shared.ts`).
- **fan-in** — at most 40 incoming edges for a non-barrel module, 200 for a barrel.
- **cycles** — zero, detected with Tarjan SCC at module level.
- **`maxDependsOn`** — a per-component cap on how many other components it may reach.
- **`maxInstability`** — a per-component cap, set only for the packages that are meant
  to be depended upon.
- **Stable Dependencies Principle** — nothing may depend on something meaningfully less
  stable than itself (`sdpTolerance` 0.15).

Test files are excluded from the graph. They consume the structure rather than forming
it, and including them makes every package appear to depend on the conformance helpers.

Three measurement decisions are worth knowing about, because they change the numbers a
lot:

- **`dist/` targets are mapped back to `src/`.** TypeScript project references resolve
  `@twistedpear/reticulum-ts` to that package's _declaration output_, so every
  cross-package import arrives pointing at `packages/<name>/dist/**.d.ts`. Excluding
  `dist/` as generated — which it is — therefore deletes every inter-package edge and
  leaves a graph in which no package depends on any other.
- **Unresolved `dist/` specifiers are joined onto the importer before that mapping.**
  Worklets import compiled output as `../packages/foo/dist/bar.js`. When `dist/` exists,
  cruiser reports a repo-relative path and the mapping above counts it. On a clean CI
  checkout the file is missing, cruiser leaves `resolved` as the relative specifier, and
  the edge vanished — which is how fan-in/fan-out exemptions looked stale on CI and still
  necessary locally. Joining first makes the graph identical either way.
- **`Ca` and `Ce` are counted in components, not modules.** Martin counts classes, but
  that is not measurable here: an outside dependency lands on the target's barrel while
  an inside dependency spreads over hundreds of files. Counting modules reports
  `protocol` — the package everything depends on — at instability 0.97, the least stable
  thing in the repository. Counting components is symmetric and barrel-insensitive.

### `api-surface` — public interface size

knip reports exports nobody uses. Nothing reports how many exist. This gate resolves
every entry in every package's `exports` map back to source, parses it with
`@typescript-eslint/parser`, and counts distinct exported symbols — **following
`export * from` re-exports recursively**, so a barrel cannot hide its size behind two
lines of star export.

Each entry point, each package total and the repository total is capped in
`api-surface-limits.json`. Adding a public export fails CI until the matching number is
raised in the same pull request, which is the point: it puts every widening of the
public surface in the diff, where it can be argued about.

### `hotspots` — churn × complexity

Report-only, nightly. Ranks files by commits in the last 180 days (`--days=` to change
the window) multiplied by summed CCN, and writes the top 50 to `hotspots.json`. A
hotspot is a prioritisation signal, not a defect — the gate never fails.

Unlike the PR gate, this one _does_ include TypeScript. It pins nothing, so there is no
second debt list to keep consistent, and a hotspot ranking that ignored the language the
core is written in would simply be wrong.

It needs `fetch-depth: 0` on the workflow checkout. A shallow clone reports one commit
per file and the ranking collapses into "whatever is most complex".

## Publication to the site

All four gates publish to the Pages site alongside the existing quality checks. Nothing
about that is special-cased — `scripts/checks/pages-plan.mjs` derives the publish plan
from the registry, so registering a gate is what publishes it. Each one gets a row in the
[results index](https://curtcox.github.io/twistedpear/results/) with its headline
numbers, a detail page carrying the full metric table, its log, and download links for
every declared artifact including the raw report and the config it was measured against.

The three PR-tier gates run on the Pages build runner. `hotspots` is nightly, so it runs
in the parallel evidence job and is imported — which is also why the build runner and the
evidence job both install `lizard==1.23.0`, the same pin CI uses.

Metric extraction lives in `scripts/site/static-analysis-metrics.mjs`:

| Gate                   | Published metrics                      |
| ---------------------- | -------------------------------------- |
| `complexity-multilang` | functions measured, pinned exemptions  |
| `coupling`             | modules, components, cycles            |
| `api-surface`          | public symbols, packages, entry points |
| `hotspots`             | files measured, churn window in days   |

Evidence for imported gates is staged by `scripts/checks/stage-evidence.mjs`, which
copies exactly the artifacts the registry declares. That step used to be an inline list
of root-level files in `pages.yml`, which meant any gate whose evidence lived outside
`artifacts/` had to be remembered in a second place — and forgetting published the gate
with its metrics blank rather than raising an error.

## Why the exemption lists exist, and how to drain them

These gates use **hard thresholds**, not ratchets. New code that crosses a limit fails,
full stop. Existing debt is pinned in the config file with **drain semantics**, which
differ from the ratchets elsewhere in the repository in one important way:

|                                   | Ratchets (`*-ratchet.json`) | These gates |
| --------------------------------- | --------------------------- | ----------- |
| Pinned entry gets worse           | fails                       | fails       |
| New violation appears             | fails                       | fails       |
| Pinned entry improves but remains | passes                      | passes      |
| **Pinned entry becomes clean**    | **passes, warns**           | **fails**   |

That last row is the whole difference. A ratchet only stops the list growing, so a list
that was drained years ago still reads as debt and nobody notices. Here, code that comes
back under its limit turns the build red until the pin is deleted — which is what turns
the file into a to-do list instead of an archive.

To drain an entry: fix the code, run the gate, and delete the line it names. The failure
message names the exact key and field:

```
Multi-language complexity: 1 stale exemption(s):
  apps/handbook/content/applets/host-info/main.js::run: no longer over any limit —
  delete this entry from complexity-multilang-rules.json
```

To recalibrate everything at once after an intended change:

```bash
npm run complexity:multilang:baseline && npm run coupling:baseline && npm run api:baseline
```

`--write` regenerates only the exemption maps. The limits themselves — `maxFanOut`,
`maxDependsOn`, `maxInstability`, the tier thresholds, every number in
`api-surface-limits.json` — are hand-set policy, and raising one is a deliberate edit
that shows up in review.

### Keys are groups, not lines

`complexity-multilang` keys exemptions as `file::function`, and names are not unique
inside a file — `(anonymous)` alone appears many times. A key therefore names a _group_
of functions and carries the worst member's value. A line number would disambiguate
them and would also go stale the moment anyone edited the lines above, which is the
opposite of what a drainable pin needs. Cycles are keyed the same way, by their
lexicographically first member.

## Excluding generated files

All three gates share `scripts/analysis/generated-paths.mjs`, which combines a path
pattern (bundles, concat parts, vendored code, emitted output) with `git check-ignore`.
The second half matters: build output lands inside the analysis roots on any machine
that has run a build, and a gate whose result depends on whether someone ran
`npm run build` first is not a gate.

`site/` and `archive/` are anchored at the repository root. `site/` is the built Pages
output, but `scripts/site/` is the hand-written builder for it and is authored code that
should be gated — an unanchored pattern silently drops eleven real files, including the
repository's fifth-worst function by CCN.

`scripts/analysis/structure-ratchet.mjs` now shares this module too. Its own private
regex did not know about the `-part-N` / `-extracted-N` concat inputs, so a single
import in `entry.mjs` was reported ten more times through the fragments it is assembled
from.

## Findings recorded but not fixed here

These came out of the measurement. They are worth their own changes; fixing them
alongside the tooling would bury it.

1. **`@twistedpear/protocol` re-exports 5,892 public symbols** through a single barrel
   with 15 `export *` statements — effectively all 200 of its modules. Every consumer
   can reach every internal, so nothing inside `protocol` can be refactored without a
   breaking-change argument. This is the package the sans-io work most depends on
   staying clean.

2. **The six import cycles look self-inflicted by the file-size ratchet.** The largest
   spans 30 modules across `reticulum-ts/src/channel/part-1..N.ts`, then 15 across
   `peer-discovery/src/*`, then 9 across
   `miniapp-runtime/src/device-manager/layer-1..3.ts`. Those `part-N` / `layer-N` names
   read like files split to satisfy `sizes`, with the halves importing each other — a
   measured metric traded for an unmeasured one. The same pattern accounts for most of
   the 30 fan-out exemptions.

3. **Two Bare-runtime shims live in `conformance/` but ship.**
   `apps/host-desktop/worklet/entry.mjs` and `apps/harness-mobile/worklet/entry.mjs`
   import `conformance/bare-interop/bare-globals.mjs` and
   `conformance/freenet-spike/bare-websocket-shim.mjs`. The new `no-tooling-in-source`
   dependency-cruiser rule catches them correctly, but they are also named in two build
   scripts, two generated import maps and a committed bundle manifest, so moving them is
   its own change. They are listed as an explicit exception in `.dependency-cruiser.cjs`
   rather than baselined, because the structure ratchet fails on baseline growth and
   there is no supported way to add a finding to it. **This is the first thing to fix**:
   the exception should be deleted and the shims moved into `packages/worklet-core`.

4. **`scripts` and `conformance` depend on each other** — 4 edges one way, 14 the other.
   Neither direction violates the Stable Dependencies Principle as measured, because the
   two trees are almost equally unstable (I = 0.90 and 0.88), so no `sdpExemptions` entry
   exists. It is still a cycle between two top-level trees at the component level, and
   worth untangling.

5. **263 npm scripts and 96 conformance suites.** No code analyzer reports this, and it
   is a real complexity surface. Consider a `sizes`-style cap on the script count.

## Installing lizard

`complexity-multilang` and `hotspots` need it; the other two are Node-only.

```bash
npm run tools:install -- --only=lizard
```

CI pins `lizard==1.23.0`, and so should you. Lizard's parsers are hand-written, and a
release that counts one more branch in a `switch` shifts CCN across the whole repository
— which would turn a green gate red for reasons found nowhere in the diff that tripped
it.

On macOS the installer uses `pipx`, not `pip3 install --user`: Homebrew's Python is
PEP 668 "externally managed" and refuses `--user` installs outright. On Linux, and in
CI, plain `pip` works.
