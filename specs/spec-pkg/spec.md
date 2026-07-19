# SPEC-PKG — Signed mini-app package format

**Group:** C (platform) · **Status:** normative · **Migration phase:** 3

## Scope

The signed package: structure, `app.manifest.json`, capability declarations, entry
points, publisher signatures, and part-packages for constrained links. Web analog: the
HTML document plus CSP declarations — the unit of content a host agrees to run.

## Normative artifacts (current locations)

- Vector suite: [vectors/packages.json](vectors/packages.json) — 2 golden
  archives (minimal, and one exercising every manifest field) that must unpack
  to the pinned manifest and package hash; 12 hostile archives that must be
  rejected with the pinned `PackageError` code (bad magic and format version,
  malformed manifest JSON, manifest/archive mismatches including a lying size
  field with a correct hash, non-lexicographic archive order, signature over
  the wrong payload, truncation, wrong key, downgrade, `minHostApi`); and a
  grant-reject vector recording that unknown capability strings parse but are
  rejected when grants are evaluated (the SPEC-CAP rule — enforced at grant
  time, not parse time). Size budgets are advisory (warn, not reject).
  Executed for both crypto providers by
  [packages/app-registry/test/spec-pkg-vectors.test.ts](../../packages/app-registry/test/spec-pkg-vectors.test.ts)
  in the default `vitest` suite.
- Informative description: [docs/package-format.md](../../docs/package-format.md)
- Registry/install behavior: [packages/app-registry](../../packages/app-registry/)
- Hostile rejects: [conformance/hostile-apps](../../conformance/hostile-apps/)

## Implementations

- `tp pack` / `tp publish` in [packages/cli](../../packages/cli/)
- Host install pipeline in [packages/host-core](../../packages/host-core/)
- DevStudio packaging path

## To finish this spec

Done — the golden + hostile vector suite landed with every reject class as
its own vector. Two prose corrections were recorded while building it (the
vectors win): unknown capability strings are rejected when grants are
evaluated, not at package parse time (the taxonomy lives in SPEC-CAP's
runtime, outside the package parser); and size budgets are advisory
warnings, not rejects. A manifest size field that disagrees with the archive
is now a hard reject (`MANIFEST_INVALID`), closing the reject-class list.
