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

`npm run visual:check` regenerates only the desktop main, capability-review, and grants
reader-guide scenes with pinned Chromium on the macOS CI runner. It compares PNG bytes
exactly and restores the committed files after the comparison, whether the check passes
or fails. Intentional UI changes use `npm run visual:baseline`; reviewers inspect the
updated images together with the UI change.

Both gates publish structured artifacts through the normal checks registry and Pages
metrics workflow. Firefox, WebKit, and Chromium are separate tool requirements so the
local gate runner skips visibly when a required browser binary has not been installed.
