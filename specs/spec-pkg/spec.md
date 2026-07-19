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
packages that must be rejected with specified reasons. Unknown capability strings block
install (see [SPEC-CAP](../spec-cap/spec.md)); that rule is enforced here at parse time.
