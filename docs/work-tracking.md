# Work tracking

<!-- tp-doc
lifecycle: reference
audited: 2026-08-07
register: none
-->

How open work is recorded, prioritised, and closed. The commands here are the
supported way to change a register row; the checks in `npm run work:check`
assume nothing else does.

## Where the data lives

| File                                          | Holds                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `STATUS-*.md`, `RELEASE-PLAN.md`              | The human-readable registers: ID, status, title, evidence, verification.            |
| [work/metadata.json](../work/metadata.json)   | Per-ID classification, prerequisites, verification command, dates.                  |
| [work/resources.json](../work/resources.json) | External prerequisites — hardware, accounts, a real LAN — and whether we have them. |
| [work/history.jsonl](../work/history.jsonl)   | Append-only journal of every add and close.                                         |

The registers stay the source of truth for **what exists and what state it is
in**. The sidecar answers **what kind of work it is and what it waits on** —
questions a markdown table cannot carry without becoming unreadable.

## Commands

```sh
npm run work:next          # the single best thing to do now, and why
npm run work:unblocked     # everything actionable, best first
npm run work:list          # everything remaining, with blocking reasons
npm run work:add -- ...    # record new work
npm run work:done -- ...   # verify and close
npm run work:check         # validate the whole registry
npm run work:log           # recent changes
npm run work:diff          # changes since a git revision, derived from commits
```

### Finding the next thing to do

```sh
npm run work:next
```

Candidates are items with status `open` and no unfinished prerequisites. Among
those, the order is fixed and total:

1. **Class** — `release-gate` > `bug` > `quality` > `docs` > `feature`. A feature
   is never proposed while an unblocked bug or code-quality item exists.
2. **Unblock count** — how many other unfinished items transitively depend on it.
3. **Age** — oldest `added` date first.
4. **ID** — lexicographic, so the answer never depends on file order.

`work:next` prints which rule decided the pick and what came second. Filter with
`--type=bug,quality`; `--json` for scripting.

### Adding work

```sh
npm run work:add -- --id=BUG-LINK-RETRY --type=bug \
  --title="Link retry backoff ignores the jitter cap" \
  --verify="npx vitest run packages/reticulum-ts/test/link.test.ts" \
  --requires=RQ-LINK,res:rnode-pair
```

`--type` is required and must be one of the five classes above — this is the
field the prioritisation runs on. `--verify` is required because `work:done`
refuses to close an item with no way to check it. Rows land in the **Backlog**
table of `STATUS-SOFTWARE.md` unless `--register` and `--section` say otherwise.

`--requires` takes item IDs and `res:` resource tokens in any mix. A token must
be declared in `work/resources.json`; a typo is reported as an error rather than
leaving the item silently parked forever.

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

## Bootstrapping and repair

`node scripts/work/backfill.mjs --write` seeds metadata for register rows that
have none, inferring verification commands from the register columns and
classifying by ID convention. It skips existing entries unless `--overwrite`.
Use it after a bulk register import, then review the diff by hand — the class of
a piece of work is a judgement, not something a script can read off a table.

`npm run work:check -- --write` rewrites `work/metadata.json` in canonical form.
It does not fix anything else; every other failure is a real disagreement between
the files that needs a decision.
