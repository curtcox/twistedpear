# Prompt: audit TwistedPear and produce a reorganization plan

Audit this repository and produce a **plan document** at `docs/reorg-plan.md`. Do not
move, rename, delete, or rewrite any other file, and do not add tests — this pass
produces a plan only. The single deliverable is that one new file.

## Why

The repo has accumulated 121 tracked markdown files across `/` (README, PLAN,
RELEASE-PLAN, STATUS-COMPLETE, STATUS-SOFTWARE, STATUS-HARDWARE, LIMITATIONS),
`docs/` (~32), `specs/` (18 specs + HANDOFF), `conformance/` (~15 READMEs),
`apps/handbook/content/` (~30 chapters), plus `formal/` and package READMEs. Several
of these are explicitly historical (`PLAN.md` self-describes as a "historical design
baseline"; `specs/HANDOFF.md` is a one-shot work order dated 2026-07-19). Others are
live registers with "Last audited" dates that drift (2026-07-06, 2026-07-08,
2026-07-16). A reader cannot currently tell, without opening several files, whether a
given capability is built, partly built, or merely designed.

Three goals, in priority order:

1. **Segregate records of past work** — completed-work evidence, superseded design
   baselines, finished handoffs, dated run logs — so they remain consultable but stop
   competing for attention with live documents.
2. **Make done-vs-planned unambiguous** at a glance, both across documents and within
   any document that mixes the two.
3. **Propose tests** that make the done/planned distinction machine-checkable rather
   than a matter of prose discipline.

## Scope

Cover all three layers:

- **Prose** — every tracked `.md`, plus `docs/simulation-architecture.html`. Root
  registers, `docs/`, `specs/`, `conformance/` READMEs, handbook content, package
  READMEs, `formal/`.
- **Repo layout and artifacts** — top-level directory structure; stray or generated
  files that appear tracked or untracked-but-present (`dependency-graph.json` at
  546 KB, `.tmp/`, `__pycache__/`, `launcher.txt`, `.bare-runtime-smoke-store/`,
  `.venv-rns/`, `dist/`, `release/evidence-logs/`); `.gitignore` coverage; whether
  anything checked in is a build output or a run artifact that should be ignored,
  archived, or regenerated on demand.
- **Code and test organization** — whether the layout of `packages/*/test`,
  `conformance/*`, `specs/spec-*/{vectors,model,tapes,schema}`, and `formal/`
  matches how the docs describe the system, and where a doc claims evidence that no
  longer lives where it says.

## Method

Read before concluding. Specifically:

- Read the seven root markdown files in full. They are the spine.
- Read `docs/README.md` and `specs/README.md` — both are indexes with their own
  status vocabulary. Note where those vocabularies disagree with each other or with
  the root registers.
- For every table row in `STATUS-COMPLETE.md` that cites an evidence path or a
  `npm run …` command, check whether the path exists and whether the script is
  defined in `package.json`. Report the count of rows that fail this check; list the
  failures. **Do not run the commands** — existence checking only.
- Do the same for evidence citations in `STATUS-SOFTWARE.md`, `STATUS-HARDWARE.md`,
  and `RELEASE-PLAN.md`.
- Check every relative markdown link across all tracked `.md` files for a resolvable
  target. Report broken ones.
- Use `git log --format='%ad %h %s' --date=short -1 -- <path>` to get each document's
  last substantive edit date, and compare against any "Last audited"/"Last
  consolidated" line inside it. Divergence is a staleness signal.
- Note documents whose content is wholly or largely superseded by another document,
  and say which supersedes which.

## What the plan must contain

Write `docs/reorg-plan.md` with these sections.

### 1. Inventory

A table of every tracked document: path, one-line purpose, current lifecycle class,
last git-edit date, self-declared audit date (if any), proposed disposition. Use
exactly these lifecycle classes and define them at the top of the section:

- **live** — describes the system as it is now; expected to change as the system does.
- **planned** — describes intended future work; has open items.
- **historical** — records something finished or superseded; consult occasionally,
  never edit.
- **reference** — stable explanatory material with no done/planned axis (motivation,
  prior art, limitations, format specs).
- **generated** — produced by tooling; should not be hand-edited and may not belong
  in version control at all.

Apply the same classification to directories and non-markdown artifacts in a second
short table.

### 2. Archive scheme

Recommend where historical records should live and justify the choice. Evaluate at
least: a top-level `archive/` tree, a `docs/history/` subtree, per-area `history/`
subdirectories, and relying on git history alone with the file deleted. Consider
discoverability from `docs/README.md`, how `git log --follow` behaves across the
move, whether links from live documents into archived ones stay meaningful, and
whether the destination should carry its own index with a "why this was archived and
what replaced it" line per entry.

State a single recommendation, then list every file to be moved with source and
destination path.

### 3. Done-vs-planned scheme

Propose one convention that works across all documents. It must cover:

- How a document declares its lifecycle class (a required frontmatter or header
  block, with the exact fields and allowed values spelled out).
- How individual items *inside* a mixed document are marked, given that the largest
  registers are markdown tables. Specify the exact column or marker.
- How the three status registers relate — whether the current
  COMPLETE/SOFTWARE/HARDWARE split is the right decomposition, or whether the axis
  should be restated (the current split mixes "is it done" with "what blocks it").
  If you propose restructuring, show the target document set and what moves where.
- Reconciliation with the vocabulary already in `specs/README.md`
  (normative / stub / stub (informative)) and any status labels in
  `conformance/README.md`. Prefer extending an existing vocabulary over inventing a
  fourth one; if you must introduce a new one, say what it replaces.

### 4. Test plan

Propose tests at two levels. For each, give: what it asserts, where the test file
goes, how it is invoked (npm script name), what makes it fail, and roughly what it
costs to run.

**Doc-claim verification** — a checkable link between prose and reality:

- Every evidence path cited in a status register resolves.
- Every `npm run …` command cited in a register is defined in `package.json`.
- Every relative markdown link resolves.
- Every document carries a valid lifecycle header, and documents classed
  *historical* live under the archive root.
- Items claimed complete are not simultaneously listed as open in another register,
  and vice versa — no item appears in two registers with conflicting status.
- Staleness bound: a *live* document whose git-edit date is materially newer than
  its declared audit date fails, or warns. Recommend which, and the threshold.

**Behavioral gap tests** — so an unimplemented claim fails a test rather than
surviving in prose:

- For each capability claimed complete, identify whether an existing test actually
  exercises it end-to-end, or whether the claim currently rests only on a cited
  command. List the claims with no backing behavioral test — these are the highest
  value additions and the plan should rank them.
- For planned work, propose the pattern for a test that exists and is explicitly
  pending (a skip/todo marker carrying the register item ID), so that the backlog is
  represented in the test suite and unskipping is the definition of done. Specify the
  exact marker and how it maps to a register row.
- Propose the guard that keeps the two in sync: a pending test whose register item is
  marked complete should fail, and a register item marked complete with a still-
  pending test should fail.

Say explicitly which of these belong in PR-tier CI and which in a nightly tier.

### 5. Layout and artifact recommendations

Concrete moves, deletions, and `.gitignore` additions for the non-prose findings,
each with a one-line justification. Flag anything where deleting risks losing
evidence a register cites.

### 6. Sequenced execution plan

Ordered steps, each independently committable, each leaving the repo in a consistent
state (no step should leave links broken until a later step). For each step: what
changes, what verifies it, and the rough size. Put the mechanical, low-risk steps
first and the ones requiring judgment about content last. Call out any step that
needs a decision from the repo owner before it can proceed.

### 7. Open questions

Anything the audit could not resolve from the repo alone.

## Constraints

- Recommend, don't hedge. Where there is a genuine tradeoff, state it in one or two
  sentences and then name your choice.
- Ground every claim in something you read. Cite `path:line` for specific findings.
  If you did not verify something, say so rather than assuming.
- Preserve the repo's existing conventions where they work. `specs/README.md`'s
  normative-vs-informative rule and its per-spec status index are working well —
  build on that pattern rather than replacing it.
- Do not propose churn for its own sake. A document that is well-placed and current
  should appear in the inventory with disposition "leave as is."
- The plan should be readable by someone who has not read the repo, and actionable
  by someone who has.
