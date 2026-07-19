# SPEC-PKG — Signed mini-app package format

**Group:** C (platform) · **Status:** stub · **Migration phase:** 3

## Scope

The signed package: structure, `app.manifest.json`, capability declarations, entry
points, publisher signatures, and part-packages for constrained links. Web analog: the
HTML document plus CSP declarations — the unit of content a host agrees to run.

## Normative artifacts (current locations)

- Canonical description: [docs/package-format.md](../../docs/package-format.md)
- Registry/install behavior: [packages/app-registry](../../packages/app-registry/)
- Hostile rejects: [conformance/hostile-apps](../../conformance/hostile-apps/)

## Implementations

- `tp pack` / `tp publish` in [packages/cli](../../packages/cli/)
- Host install pipeline in [packages/host-core](../../packages/host-core/)
- DevStudio packaging path

## To finish this spec

Golden-package vector suite: valid packages that must install, malformed/hostile
packages that must be rejected with specified reasons. Reject classes to cover, each
as its own vector: bad magic/version, malformed manifest JSON, manifest/archive file
mismatch (missing, extra, hash, or size), non-lexicographic archive order, signature
over wrong payload or wrong key, unknown capability string (the
[SPEC-CAP](../spec-cap/spec.md) rule, enforced here at parse time), and oversize
against the declared budgets. Golden cases: a minimal valid package and one
exercising every manifest field. Seed hostile cases from
[conformance/hostile-apps](../../conformance/hostile-apps/); prose in
package-format.md becomes informative once the vectors land.
