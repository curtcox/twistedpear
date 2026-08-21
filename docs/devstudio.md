# DevStudio: the in-platform development environment

<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

DevStudio ([apps/devstudio](../apps/devstudio)) is a mini-app development
environment that is **itself a mini-app**: a single SDK-only bundle running in
the standard sandbox. Because it is packaged, signed, and distributed like any
other app — and can package and publish any workspace project — it can create
and distribute other mini-app development environments, including copies of
itself.

## Capabilities it requests

| Capability     | Used for                                                                   |
| -------------- | -------------------------------------------------------------------------- |
| `workspace`    | Project source files (`<project>/app.json` + sources)                      |
| `ai:chat`      | AI-assisted editing through the host's OpenRouter-compatible endpoint      |
| `apps:package` | Pack + sign a project under the device publisher identity (asks each time) |
| `apps:publish` | Publish the signed package to other users (asks each time)                 |
| `apps:install` | Install an app from a pasted 256t string (asks + capability review)        |
| `apps:preview` | Run the app under development in the host's dev-preview slot               |
| `share:cas`    | Content-addressed sharing by 256t id                                       |
| `storage:kv`   | UI state                                                                   |

Like every mini-app it can be granted a subset: without `ai:chat` the editor
still works, without `apps:publish` it is a local-only IDE, and so on.

## The development loop

1. **New hello project** seeds `hello-app/app.json` + `hello-app/bundle.js`. **New Guida project** seeds `elm.json` + `src/*.elm`. Add file, Format, and Check run against the workspace; Preview/Package run `apps.compile` in host chrome.
2. **Edit** in the `code-editor` widget. The widget is content-by-reference:
   the tree carries only a `documentId`; the host resolves file content from
   the workspace and edits flow back as events which DevStudio persists with
   `workspace.write`. Files are limited to 256 KiB.
3. **AI edit**: describe a change; DevStudio sends the file plus your request
   to `ai.chat`. The host holds the endpoint URL, API key, and model
   (desktop **Settings → AI**; `HostConfig.ai` for headless nodes) — the key
   never enters any sandbox. v1 uses whole-file replacement: review the
   proposal, then **Apply** or **Reject**.
4. **Preview** runs the project in a second, fully sandboxed host slot with
   the grants you approve — the DevStudio session itself keeps running.
5. **Package & sign** (host confirmation) builds the deterministic `.tpkg`,
   signs it with the device publisher identity, stores it in the local CAS,
   and shows the 94-character 256t string as a QR code.
6. **Publish** (host confirmation) seeds the archive on the existing
   transports and announces the app + CAS locator.
7. On the other device: trust the publisher (identity QR/256t string), paste
   or scan the package string, review the requested capabilities (grant a
   subset if you like), install, and run. Resource limits can be tightened
   before or while the app runs, and any app can be force-quit.

## Consent model

Every dangerous operation a mini-app initiates — package, publish, install,
preview, trust import — must pass the **host confirmation channel**: a modal
in host chrome (outside the widget surface) showing the requesting app, the
publisher key fingerprint, and an operation summary. Mini-apps cannot draw
over or acknowledge these dialogs, and confirmation tokens never transit the
broker. See [miniapp-runtime.md](miniapp-runtime.md).

## Automated validation

`npm run test:devstudio-loop` runs the full two-instance loop on one machine:
instance A develops (direct + AI edit against a mock OpenRouter server),
previews, packages, and publishes; instance B trusts A, resolves the 256t
string over a real Reticulum link, reviews capabilities (granting a subset),
installs, runs, observes a capability denial, adjusts limits, and
force-quits. See [conformance/devstudio-loop](../conformance/devstudio-loop/README.md).

## v1 limitations

- Projects may be a single-file JavaScript bundle or a multi-file Guida project (`elm.json` + `src/*.elm`). Guida compiles in host chrome via `apps.compile`. Format and Check use `apps.format` / `apps.diagnostics` without a confirmation prompt.
- DevStudio consumes `ai.chatStream` incrementally and shows the growing whole-file proposal.
  Apply remains disabled until the final event, so partial output cannot overwrite a file.
- One preview slot; previewing again replaces the previous preview.
- Desktop accepts pasted 256t strings and host-owned camera scans when Chromium
  `BarcodeDetector` is available.
