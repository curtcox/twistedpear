# DevStudio walkthrough

<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

DevStudio is a mini-app IDE — same sandbox and
capability model as any other app. Desktop first-boot seeds it alongside this
Handbook.

## Development loop

1. **New project** — DevStudio seeds `hello-app/app.json` + `bundle.js`, or a Guida
   project (`elm.json` + `src/*.elm`). You can add more files from the editor.
2. **Edit** — the `code-editor` widget is content-by-reference: the tree carries
   a `documentId`; edits flow back as events and persist with `workspace.write`.
3. **AI assist** — with `ai:chat` granted, describe a change; the host holds the
   API key and model (never in the sandbox). Review whole-file proposals before
   **Apply**.
4. **Preview** — `apps:preview` runs the project in the single dev-preview slot
   while DevStudio keeps running.
5. **Package & sign** — host confirmation; deterministic `.tpkg` under the
   device publisher identity; 256t id + QR.
6. **Publish** — host confirmation; seed on Hyperdrive and announce the locator.

## Open in DevStudio from the Handbook

Every applet card includes **Open in DevStudio**. The Handbook exports the
applet source plus a `tp.devstudio.workspace.v1` handoff via `share:cas`; paste
or scan the QR in DevStudio to import the sample as a starting project.

Try it on the identity probe below, then continue in DevStudio with
[Packaging & preview](chapter:sdk-apps-package).

{{applet:identity-hash}}
