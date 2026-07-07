# DevStudio two-instance loop

Automated validation for the in-platform development environment
([docs/devstudio.md](../../docs/devstudio.md)): a mini-app is created on one
local host instance and transmitted to a second one — via a 94-character 256t
string — that reviews, installs, and runs it. Both instances run in one
process on one machine (macOS or Linux), connected only by an in-process
Reticulum pipe link; no hardware, network, or API keys are required.

```sh
npm run test:devstudio-loop
```

## What it exercises

Instance A (developer):

1. Installs and launches the signed DevStudio mini-app (pre-launch capability
   review, all eight dev capabilities granted).
2. Creates a hello project; asserts the `code-editor` widget renders by
   reference (`documentId`), then edits the source through the editor event.
3. Requests an AI edit against a **local mock OpenRouter server** (canned
   whole-file completion); asserts the API key never crosses the broker, then
   applies the proposal to the workspace.
4. Declares `storage:kv` + `lxmf:send` in the project manifest.
5. Previews the app in the sandboxed dev-preview slot, then stops the preview.
6. Packages and signs (host confirmation `package`), extracts the 94-char 256t
   id from the rendered `qr-code` widget, and publishes (confirmation
   `publish`): Hyperdrive-less here — the archive is served over the
   Reticulum Resource path with app + `TPCL` CAS locator announces.
7. Asserts exactly one confirmation each for `preview`, `package`, `publish`,
   with the requested capabilities in the package summary.

Instance B (recipient):

8. Imports A's publisher identity from its inline 256t identity string into
   the trust store.
9. Resolves the 256t id via the collected CAS locator announce, fetches over
   the Resource path, verifies SHA-512 + package signature, records the
   capability review (declared `storage:kv, lxmf:send`; **grants only
   `storage:kv`**), and installs (trusted badge asserted).
10. Runs the app; asserts the AI-authored UI renders, then asserts a
    `lxmf:send` attempt surfaces as a visible capability denial (fewer
    capabilities than requested).
11. Adjusts resource limits while running (live rate change; memory flagged
    `memoryPendingRestart`), then force-quits and asserts the `stopped` state.

The script exits non-zero on any assertion, prints failures before teardown,
and enforces a 240 s global deadline.
