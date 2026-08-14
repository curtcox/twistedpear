# Work tracking

<!-- tp-doc
lifecycle: reference
audited: 2026-08-14
register: none
-->

How open work is recorded, prioritised, and closed. The commands here are the
supported way to change a register row; the checks in `npm run work:check`
assume nothing else does.

## Where the data lives

| File                                                | Holds                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `STATUS-*.md`, `RELEASE-PLAN.md`                    | The human-readable registers: ID, status, title, evidence, verification.                    |
| [work/metadata.json](../work/metadata.json)         | Per-ID classification, prerequisites, verification command, dates.                          |
| [work/resources.json](../work/resources.json)       | External prerequisites — hardware, accounts, a real LAN — and whether we have them.         |
| [work/history.jsonl](../work/history.jsonl)         | Append-only journal of every add, close, and audit.                                         |
| [work/audit-report.json](../work/audit-report.json) | The last recorded periodic review — findings, and the ratchet snapshot it compares against. |

The registers stay the source of truth for **what exists and what state it is
in**. The sidecar answers **what kind of work it is and what it waits on** —
questions a markdown table cannot carry without becoming unreadable.

## Commands

```sh
npm run work:next          # the single best thing to do now, and why
npm run work:unblocked     # everything actionable, best first
npm run work:list          # everything remaining, with blocking reasons
npm run work:add -- ...    # record new work
npm run work:retype -- ... # reclassify, with a recorded reason
npm run work:done -- ...   # verify and close
npm run work:check         # validate the whole registry
npm run work:import        # turn baselined ratchet debt into quality items
npm run work:audit         # periodic review of what the tracking has produced
npm run work:log           # recent changes
npm run work:diff          # changes since a git revision, derived from commits
```

### Finding the next thing to do

```sh
npm run work:next
```

Candidates are items with status `open` and no unfinished prerequisites. Among
those, the order is fixed and total:

1. **Class** — `broken-gate` > `release-gate` > `bug` > `quality` > `docs` >
   `feature`. A feature is never proposed while an unblocked bug or code-quality
   item exists, and nothing at all is proposed while a gate is red.
2. **Unblock count** — how many other unfinished items transitively depend on it.
3. **Effort** — remaining files for a ratchet-imported item (live from the
   baseline), otherwise 1. Smaller first, so a 5-file fix outranks a 164-file
   campaign of the same class.
4. **Age** — oldest `added` date first.
5. **ID** — lexicographic, so the answer never depends on file order.

`work:next` prints which rule decided the pick and what came second. Filter with
`--type=bug,quality`; `--json` for scripting.

### Red gates are derived, not filed

`broken-gate` items are the one class nobody writes down. They are computed on
every read from `checks.json` — the committed record of which static-analysis
gates passed, written by `npm run checks:status` — one `GATE-<ID>` item per gate
that is failing.

Derivation is the point. A hand-filed row can be typed as something milder, left
open after the fix, or closed while the check is still failing; all three have
happened, and each one ends with a red gate nobody is looking at. A derived item
appears the moment the gate goes red and vanishes the moment it goes green, so
the only way to clear it is to fix the check:

- `work:done` and `work:retype` refuse a `GATE-*` id and say what to run instead.
- `work:add` refuses the `GATE-` prefix and the `broken-gate` type, so a
  hand-written entry cannot shadow the derived one.
- There is no register row to flip and no journal event to record.

The escape hatch is a waiver, not a reclassification:

```sh
npm run checks:waive -- --gate=audit-policy --days=14 \
  --reason="upstream advisory has no fixed release yet"
npm run checks:waive -- --list
npm run checks:waive -- --revoke=audit-policy
```

A waived gate stops preempting the queue but stays visibly red in
`release:status` and `work:audit`, and the waiver expires (30 days maximum). An
expired waiver counts as none: the item returns to the top of the queue and the
soak guard refuses again. See the green-gate rule in
[RELEASE-PLAN.md](../RELEASE-PLAN.md) §3 for why the rule is shaped this way.

### Adding work

```sh
npm run work:add -- --id=BUG-LINK-RETRY --type=bug \
  --title="Link retry backoff ignores the jitter cap" \
  --verify="npx vitest run packages/reticulum-ts/test/link.test.ts" \
  --requires=RQ-LINK,res:rnode-pair
```

`--type` is required and must be one of the hand-assignable classes above
(everything except `broken-gate`, which is derived) — this is the
field the prioritisation runs on. `--verify` is required because `work:done`
refuses to close an item with no way to check it. Rows land in the **Backlog**
table of `STATUS-SOFTWARE.md` unless `--register` and `--section` say otherwise.

`--requires` takes item IDs and `res:` resource tokens in any mix. A token must
be declared in `work/resources.json`; a typo is reported as an error rather than
leaving the item silently parked forever.

### Reclassifying work

```sh
npm run work:retype -- --id=QL-TYPED-… --type=bug \
  --reason="unhandled rejections in protocol code, not a style issue"
```

Class decides ordering, so a retype silently changes what `work:next` proposes.
`--reason` is required and is journaled with the change; `npm run work:log`
prints it. Prefer this to editing `work/metadata.json` by hand, which leaves
`work:diff` reporting a reclassification nobody explained.

### Closing work

```sh
npm run work:done -- --id=BUG-LINK-RETRY --evidence=packages/reticulum-ts/test/link.test.ts
```

`work:done` refuses unless it can actually establish the work is finished:

- `--evidence` is required, and every path is checked to exist.
- The recorded `verify` command is **run**, streamed to the terminal and to
  `release/evidence-logs/`. A non-zero exit leaves the item open.
- An item with unfinished prerequisites cannot be closed at all.

On success the row moves from `STATUS-SOFTWARE.md` to `STATUS-COMPLETE.md`
(hardware rows and release gates flip in place, since their prose sections and
statements stay where they are), the metadata gains `completed` and `evidence`,
and the journal gains a `close` event. The command then reports which items the
close just unblocked.

Hardware items are verified by a physical runbook, not a command, so their
`verify` reads `runbook:STATUS-HARDWARE.md#...`. Closing one requires
`--allow-unverified --reason="<what you actually ran>"`, and the reason is
recorded permanently — `npm run work:log --unverified` lists every such close.

### Closing work that takes days

A 72-hour soak cannot run inside `work:done` — it is started by
`npm run release:start-soaks` and watched separately. Point `work:done` at the
log it produced instead:

```sh
npm run work:done -- --id=RQ-TRANSPORT \
  --evidence=release/evidence/soaks-plan-duration.json \
  --from-log=release/evidence-logs/2026-09-01-rq-transport.log
```

The log must exist and be non-empty; its SHA-256 goes into the journal, so the
record names a specific artifact rather than a claim. This still counts as
verified — `verifiedFrom: "log"` rather than `"run"` — and is categorically
different from `--allow-unverified`, which records that nothing was checked.

### Importing quality debt

The ESLint-family ratchets already hold thousands of baselined violations that
can only shrink. `work:import` turns them into tracked `quality` items, one per
rule:

```sh
npm run work:import -- --top=5          # propose
npm run work:import -- --top=5 --write  # create
```

Grouping is by rule rather than by file on purpose: the lint ratchet holds 6,309
entries across 227 files but only seven distinct rules, so per-rule items stay
countable while per-file items would not. Each gets a verification that means
something — the ratchet's own check command, plus
`scripts/work/ratchet-clear.mjs`, which fails while any baselined entry for that
rule remains. Fixing the code is not enough; the baseline has to be re-recorded
too, which is exactly the condition worth gating on.

### Acquiring a resource

When a device or account arrives, flip it in `work/resources.json`:

```json
"rnode-pair": { "available": true, "acquired": "2026-09-01" }
```

Every item waiting on it becomes actionable at once; `npm run work:unblocked`
shows the new list.

## Reviewing what changed

Two independent views, deliberately not sharing a code path:

```sh
npm run work:log -- --since=2026-08-01     # from the journal
npm run work:diff -- --since=HEAD~20       # from committed content
```

`work:log` reads `work/history.jsonl` and knows things the files cannot show —
whether a verification actually ran, how long it took, and the reason attached to
any unverified close. Filter with `--id`, `--type`, `--action`, `--unverified`,
`--limit`.

`work:diff` reconstructs the registry from `git show` at a revision and diffs it
against the working tree, reporting items added, closed, reopened, retyped, and
prerequisite changes, plus resources that flipped. It never reads the journal.

The reason for keeping both: closing an item moves its row between files, which
git records as a delete plus an unrelated add, so `git blame` and `git log -L`
lose the item's own history. The journal follows the item; the diff follows the
commits.

## Auditing what the tracking produced

Both views above answer "what changed". Neither asks whether the result is any
good: whether a closed item's evidence still holds, whether an item that has been
open for months is still wanted, whether the debt the ratchets hold is shrinking.

```sh
npm run work:audit            # propose fixes and improvements
npm run work:audit -- --record # write the report and reset the clock
```

It writes no register row and creates no item — every finding is a proposal with
the judgement attached. `work:next` and `work:done` print a nudge once the audit
is 14 days or 5 closes old, which is what makes it periodic without a scheduler.
Families, checks, thresholds, and the report format are in
[work audit](work-audit.md).

## What `work:check` enforces

Run by `npm run test:doc-audit`, which is part of `npm run check:ci-base`.

| Check                | Fails when                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| metadata shape       | Unknown field, bad class, malformed ID or date, missing required field.                            |
| resources shape      | A resource lacks a boolean `available`, or its token is malformed.                                 |
| canonical form       | `work/metadata.json` is not sorted/keyed canonically. `--write` fixes it.                          |
| register coverage    | A register row has no metadata entry, or an entry has no row.                                      |
| prerequisites        | A `requires` entry resolves to nothing, a cycle exists, or a done item depends on unfinished work. |
| verify commands      | A `verify` names an npm script that does not exist, or a runbook file that does not.               |
| evidence paths       | Cited evidence does not exist in the repo.                                                         |
| journal shape        | A malformed line, unknown action, or a timestamp that goes backwards.                              |
| journal append-only  | The committed journal is not a byte prefix of the working copy.                                    |
| journal vs registers | A row is `done` with no closing event, or an event contradicts the register.                       |

The last two are the ones that matter for trust. `AGENTS.md` says not to change
status registers merely to make a test pass; the journal reconciliation is what
makes that rule enforceable rather than advisory. Editing `open` to `done` by
hand fails CI, because there is no closing event — and re-writing the journal to
add one fails the append-only check.

### The epoch

Work that was already complete when the journal started cannot have a closing
event, so the journal's first `epoch` event names those items explicitly:

```json
{ "action": "epoch", "commit": "703e76ee…", "grandfathered": ["S0", "S1", "…"] }
```

The exemption is a list of IDs anchored to a commit, not a date. `work:check`
verifies each grandfathered item already read `done` in the registers **at that
commit**, that the commit is an ancestor of `HEAD`, that there is exactly one
epoch, and that it precedes any close. A date-based exemption would have been
widenable after the fact by backdating an item's `completed` field; this is not.

## Bootstrapping and repair

`node scripts/work/backfill.mjs --write` seeds metadata for register rows that
have none, inferring verification commands from the register columns and
classifying by ID convention. It skips existing entries unless `--overwrite`.
Use it after a bulk register import, then review the diff by hand — the class of
a piece of work is a judgement, not something a script can read off a table.

`npm run work:check -- --write` rewrites `work/metadata.json` in canonical form.
It does not fix anything else; every other failure is a real disagreement between
the files that needs a decision.
