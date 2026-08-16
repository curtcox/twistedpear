# Coverage policy

<!-- tp-doc
lifecycle: live
audited: 2026-08-16
register: none
-->

This document describes the per-file policy layered beneath the aggregate coverage
ratchet in [Static analysis](static-analysis.md).

## New-file floor

The coverage ratchet is a per-workspace aggregate, and an aggregate cannot see a new
file arrive untested. Four hundred uncovered lines added to a package sitting at 74%
move that number by a point or two, which the 0.5-point tolerance and ordinary noise of
a refactor absorb—so the file lands at zero and the gate stays green.

`coverage-rules.json` therefore carries a `newFile` block: 60% statements, 45%
branches, and 60% functions. It applies to files added since the base ref, compared
three-dot against the merge base so a branch is never asked to answer for a file
someone else added to `main` after it forked. Existing files remain held by their
workspace ratchet.

Paths outside the coverage roots, generated files, and reasoned `newFile.exempt`
entries are skipped rather than judged. Exemptions are printed on every run. The
decision logic lives in `scripts/analysis/coverage-new-files.mjs` and is tested by
`conformance/checks/coverage-new-files.test.mjs`.

## Changed-line floor

The aggregate has the same blind spot when an existing low-coverage file changes.
`changedLine` holds executable statements and branch arms whose Istanbul source
locations intersect the new-side lines of the pull-request diff to 80% and 70%
respectively.

The check reads `coverage/coverage-final.json`; a metric with no executable location
on a changed line is unmeasured rather than credited with 100%. Generated files and
reasoned `changedLine.exempt` entries are excluded. The diff parser and location policy
live in `scripts/analysis/coverage-changed-lines.mjs` and are tested by
`conformance/checks/coverage-changed-lines.test.mjs`.
