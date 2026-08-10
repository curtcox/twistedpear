# Work audit

<!-- tp-doc
lifecycle: reference
audited: 2026-08-10
register: none
-->

`npm run work:audit` re-reads what the tracking system has produced and reports
what looks worth fixing. It is the counterpart to [work tracking](work-tracking.md):
`work:check` asks whether the registry is _consistent_, this asks whether it is
still _true_, and whether the debt it points at is moving in the right direction.

It creates nothing. Every finding is a proposal; accepting one means running
`work:add`, `work:retype`, or `work:done` yourself.

```sh
npm run work:audit                      # summary and review brief
npm run work:audit -- --severity=high   # only what looks wrong rather than untidy
npm run work:audit -- --family=closed   # one family
npm run work:audit -- --json            # the report, for scripting
npm run work:audit -- --record          # write work/audit-report.json and journal the run
```

## What it looks at

Four families, run together and reported as one ordered list.

| Family     | Check                     | Fires when                                                                                     |
| ---------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| `registry` | `stale-open`              | An unblocked item has sat 90 days with no journal event of its own.                            |
| `registry` | `parked`                  | An item has waited 60 days on a resource nobody has acquired.                                  |
| `registry` | `weak-verify`             | A non-`docs` item is verified by `true`, `work:check`, or `test:doc-audit`.                    |
| `registry` | `shared-verify`           | Four or more open items share one verification command.                                        |
| `registry` | `orphan-resource`         | A declared resource token is required by nothing.                                              |
| `outputs`  | `ratchet-growth`          | A ratchet holds more baselined entries than at the last audit.                                 |
| `outputs`  | `untracked-debt`          | A ratchet rule with 25+ entries has no `quality` item. Carries a ready-made `work:add` line.   |
| `outputs`  | `advisory-expiry`         | An `audit-allowlist.json` exception expires within 30 days, or already has.                    |
| `outputs`  | `stale-report`            | A generated analysis output is 21+ days behind the newest commit under `packages/` or `apps/`. |
| `closed`   | `unverified-close`        | An item was closed with `--allow-unverified`, so nothing ever checked it.                      |
| `closed`   | `digest-mismatch`         | A cited evidence log no longer hashes to the digest recorded at the close.                     |
| `closed`   | `missing-evidence-log`    | A cited evidence log has left the tree.                                                        |
| `closed`   | `instant-verification`    | A bug or release gate closed on a command that returned in under two seconds.                  |
| `closed`   | `evidence-drift`          | Cited evidence changed a week or more after the close that relied on it.                       |
| `docs`     | `audit-date-behind-edits` | A live document's `audited:` date trails its own edits far enough to warn.                     |
| `docs`     | `overtaken-plan`          | A plan's live counterpart moved on 30+ days past the plan's audit date.                        |
| `docs`     | `idle-plan`               | A plan has had no edit in 180 days.                                                            |

Thresholds are constants at the top of the `scripts/work/audit-*.mjs` module that
owns each family; they are decomposition prompts, not policy, and changing one is
a normal edit.

Two of these are worth calling out because nothing else in the repo can see them.
`ratchet-growth` compares against the snapshot in the previous report: every
individual re-baseline passes its own check by definition, so a ratchet that is
quietly growing is invisible until two runs are compared. `digest-mismatch`
re-computes the SHA-256 that `work:done` recorded, which is the only thing that
turns a closed item's evidence from a claim back into a checkable artifact.

## The review brief

A script can tell that `WORK-EFFORT` has been open for 90 days. It cannot tell
whether that means "do it now" or "we changed our minds". So each finding carries
an `ask` — the judgement it is handing back — and the summary ends with how many
are waiting. That list is the agenda: work through it and record each decision
with the normal commands, so the outcome lands in the journal rather than in a
session transcript.

Where a finding does resolve mechanically, it also carries a `proposal`, printed
as the exact `work:add` command that would create the item.

## When it runs

There is no scheduler. The audit is due when either clock runs out:

- **14 days** since the last recorded audit, or
- **5 closes** journaled since it.

`npm run work:next` and `npm run work:done` print a one-line nudge when it is due
— the two commands every session already runs. `npm run work:audit -- --record`
appends an `audit` event to `work/history.jsonl` and resets both clocks.

Recording is a deliberate flag rather than the default because an audit nobody
read should not silence the nudge. The clock lives in the journal rather than in
the report file's mtime so that it survives a fresh clone and cannot be reset by
a run that found nothing.

## The report

`--write` and `--record` write [work/audit-report.json](../work/audit-report.json):

```json
{
  "version": 1,
  "generatedAt": "2026-08-10T18:20:00.000Z",
  "commit": "856957d2…",
  "counts": { "total": 6, "high": 1, "medium": 4, "low": 1 },
  "ratchets": { "lint-ratchet.json": 6309 },
  "findings": [{ "family": "…", "check": "…", "severity": "…", "ask": "…" }]
}
```

Findings are sorted by severity, then family, check, and location, so the file is
byte-identical across two runs over the same tree and its diff shows movement
rather than reordering. `ratchets` is the snapshot the next run compares against;
it is the reason the report is committed rather than ignored.
