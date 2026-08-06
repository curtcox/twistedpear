# File-size classification and ratchet

<!-- tp-doc
lifecycle: live
audited: 2026-08-02
register: none
-->

**This document describes the gate as it works today.** The original reduction schedule
has been completed and is retained as an
[executed work order](../archive/meta/file-sizes-plan.md).

Large files hide seams. This gate classifies every tracked source file by size, warns
before a file gets unwieldy, and fails the build when a new file crosses the danger
threshold for its type. The initial grandfather list has been fully decomposed:
`size-ratchet.json` now has zero entries and a zero excess-line ceiling.

## Commands

```sh
npm run sizes
```

Runs the inventory and the ratchet gate. It is part of `npm run check:ci-base`, so the
base CI job and the local pre-handoff check both enforce it. The Pages workflow runs it
again as a reported job (see below).

- `npm run sizes:inventory` — classify only, write `file-sizes.json`, never fail.
- `npm run sizes:baseline` — rewrite `size-ratchet.json` from the current inventory.
  It refuses to add files or raise recorded sizes; pass `--allow-regressions` to
  override, which is a deliberate loosening and should be justified in the commit.

## Thresholds

Thresholds live in `size-rules.json`. Rules are ordered and the first matching rule wins,
so `**/*.test.ts` is classified as a test before it is classified as TypeScript.

| Type                                |      Warn |     Danger |
| ----------------------------------- | --------: | ---------: |
| Markdown documentation              | 272 lines |  593 lines |
| Test and conformance source         | 371 lines | 1161 lines |
| TypeScript source                   | 400 lines |  797 lines |
| Build, tooling, and worklet scripts | 392 lines |  769 lines |
| JavaScript source                   | 228 lines |  763 lines |
| Native and Python source            | 377 lines |  685 lines |

These values were re-derived from the post-cleanup distribution on 2026-08-02. Each
rule records that distribution (`count`, median, p90, and maximum) in `size-rules.json`.
Warn thresholds use the measured p90 unless the existing warning was already stricter;
danger thresholds use the measured maximum, so any growth at the top immediately asks
for another decomposition without grandfathering a file.

Two secondary dimensions catch files that stay inside the line budget while carrying an
outsized payload:

- **Bytes** — derived from the line thresholds at 100 bytes per line unless a rule states
  `warnBytes`/`dangerBytes` outright.
- **Longest line** — warn at 200 characters, danger at 2000. The danger level is a
  minification detector, not a style rule; deliberately inlined bootstrap strings sit
  well under it.

A file's status is the worst status across all three dimensions.

Tests retain a larger line budget: table-driven cases and vector fixtures grow
legitimately in a way production modules do not.

## What the thresholds mean

`warn` means "look for a seam" — it is reported on the site and never fails a build.
`danger` means "split it before adding more". Neither is an architectural limit; they are
prompts to decompose. Each rule carries `guidance` in `size-rules.json` describing the
decomposition that usually applies to that type.

## Exemptions

`size-rules.json` lists exempt globs: generated bundles (`**/*.bundle*`,
`**/*.gen.ts`, `**/*.generated.mjs`), vendored code (`**/vendor/**`), and `archive/**`.
Exempt files are counted and listed in `file-sizes.json` but never classified or gated —
their size is a property of the generator, not of anything a reviewer can decompose. Add
a glob here only for genuinely generated or third-party content.

Data files (JSON vectors, fixtures) are not in scope at all: no rule matches them.

## How the ratchet fails

The gate fails when any of these hold:

1. A file reaches `danger` and is not listed in `size-ratchet.json`.
2. A listed file grew past its recorded lines, bytes, or longest line.
3. The list itself grew relative to the committed baseline at `HEAD`.
4. Measured excess lines — the sum of `lines − dangerLines` over every file at
   danger — exceed the committed `maxExcessLines` ceiling.

Rule 3 stops a new offender from being waved through by appending to the baseline. Rule
4 keeps the aggregate at its current zero ceiling. The baseline machinery remains for
emergency compatibility, but ordinary work must keep `entries` empty. Stale entries are
reported as warnings; `--strict-stale` promotes them to failures.

The intended workflow when the gate fails on your change is to decompose the file, not to
edit `size-ratchet.json`.

## Where results are published

`npm run site:reports` runs the gate as the `file-sizes` job. Results appear on the
deployed Pages site under **Quality results**:

- a summary line and a pass/fail row on the index
- a `file-sizes` detail page with per-type distribution (count, median, p90, max), an
  excess-lines-by-area burndown chart, and the largest files over danger
- downloadable `file-sizes.json`, `size-rules.json`, and `size-ratchet.json` under
  `results/raw/`

`SITE_REPORT_JOBS=file-sizes npm run site:reports` regenerates just this job locally,
reusing the previously recorded results for everything else.

## Related

- [Executed file-size reduction plan](../archive/meta/file-sizes-plan.md) — historical work order
- [Sans-IO protocol discipline](sansio.md) — the gate that uses the same ratchet pattern
- `AGENTS.md` — the safe default loop and base check
