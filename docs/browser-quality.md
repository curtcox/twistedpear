# Browser quality

<!-- tp-doc
lifecycle: reference
audited: 2026-08-16
register: none
-->

The normal `test:web-examples` gate is the fast Chromium check. The
`test:web-examples:cross-browser` PR gate reuses the same chat, file-drop, and board
behavioral harness under pinned Firefox and WebKit. This exposes browser-specific
worker, storage, and package-loading failures without duplicating the scenarios.

`npm run visual:check` regenerates six critical reader-guide scenes with pinned Chromium
on the macOS CI runner: desktop main, capability review, grants, host confirmation,
runtime controls, and an untrusted publisher. It compares PNG bytes exactly and restores
the committed files after the comparison, whether the check passes or fails. Intentional
UI changes use `npm run visual:baseline`; reviewers inspect the updated images together
with the UI change.

`npm run test:ui-invariants` complements those pixels with behavior. It loads the real
desktop renderer against a controlled preload bridge and proves that publisher identity
and capability rationale are visible, denial stays host-owned, trust details are one
interaction away, and a grant can actually be revoked.

Both gates publish structured artifacts through the normal checks registry and Pages
metrics workflow. Firefox, WebKit, and Chromium are separate tool requirements so the
local gate runner skips visibly when a required browser binary has not been installed.
