# Web Editor Plan — DevStudio on the documentation site

<!-- tp-doc
lifecycle: historical
audited: 2026-08-21
register: none
-->

> **Status of this plan (archived 2026-08-21):** Executed. Current behaviour is in
> [docs/devstudio.md](../../docs/devstudio.md#browser-editor-documentation-site) and
> [docs/web-host.md](../../docs/web-host.md). The sections below are retained as the
> original design rationale.

**This document describes intended remaining work, not current behaviour.** What ships today is
[DevStudio](devstudio.md) (the in-platform environment), the
[web host](web-host.md) (the browser port of the whole stack), and the
[Guida UI](guida-ui.md) surface that a Guida app compiles against. Those documents win
where this one disagrees, until the work below lands.

The goal: a page on <https://curtcox.github.io/twistedpear/> where anyone can **edit,
preview, and run** a mini-app — JavaScript or Guida — with no install, no account, and no
server. GitHub Pages serves static files only, so everything here runs in the visitor's tab.

## 1. What already exists

Almost every part is built. The work is assembly, plus one real gap (§4).

| Piece                        | Where it already lives                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Browser host running real bundles | [`scripts/site/react-native-web-samples/entry.tsx`](../scripts/site/react-native-web-samples/entry.tsx) — `MiniappHost` + `WebSandboxBackend` + `MiniappWidgetTree`, published at `/react-native-web/` |
| Deterministic demo services  | Same file: memory KV/CAS, canned `ai:chat`, stub package/publish, presence, host info                       |
| Peer pairing without a server | [`peer-chrome.ts`](../scripts/site/react-native-web-samples/peer-chrome.ts) — Manual/QR/Audio + WebRTC       |
| The editor itself            | [`apps/devstudio/bundle.js`](../apps/devstudio/bundle.js) — new project (JS **and** Guida), multi-file edit, Format, Check Guida, Preview, Package, Publish |
| Editing surface              | `code-editor` widget (`documentId`, `language` ∈ `javascript \| json \| text \| elm`), rendered by `widget-renderer-rn` |
| DevStudio booting in a browser | [`conformance/web-devstudio/`](../conformance/web-devstudio/) — packs, signs, and drives it under Playwright |
| Apps backend actions         | [`packages/worklet-core/src/miniapp-host-shared-backends.mjs`](../packages/worklet-core/src/miniapp-host-shared-backends.mjs) — `createAppsBackend{Compile,Format,Diagnostics,Preview,Package,Publish}Action` |
| In-browser Guida compile     | [`packages/guida-twistedpear/src/worklet.ts`](../packages/guida-twistedpear/src/worklet.ts) — no `node:fs`, no terser; `compileGuidaWorkspace` / `diagnoseGuidaWorkspace` / `formatGuidaSource` |
| Static-site build hook       | [`scripts/site/build.mjs`](../scripts/site/build.mjs) step for `/react-native-web/`, verified by [`conformance/web-cookbook/run.mjs`](../conformance/web-cookbook/run.mjs) |

## 2. Shape of the thing

**The page runs the real DevStudio mini-app.** Not a re-implementation of an editor in page
chrome: the same signed bundle that ships to desktop and mobile, launched in the browser
sandbox, with page chrome around it for the things a mini-app cannot do for itself
(share links, reset, the confirmation dialog, peer pairing).

That choice is the point of the exercise. DevStudio is a mini-app; if it cannot carry an
editing session on a static page, the claim that mini-apps are enough is weaker than the
[Handbook](handbook.md) says it is. It also means every improvement to DevStudio reaches
the site for free, and the site cannot drift into a second editor with different behaviour.

The cost is honest and belongs on the page: the editing surface is the `code-editor`
widget, so it has exactly the affordances `widget-renderer-rn` gives it — no syntax
highlighting or completion until that widget grows them (§8).

**Host stack: in-page, not the web-core worker.** `/react-native-web/` proves the small
path — `MiniappHost` in the page with demo backends — and it needs no WebSocket gateway.
The full [web host](web-host.md) worker (`web-core.worker.js`, a real Reticulum leaf peer)
stays the fallback for a later "publish for real" phase; a static page has nothing to
publish to.

## 3. Phase 1 — one browser host adapter, two pages

`createDemoHost` in the samples page is already what the editor needs, minus persistence
and minus a real apps backend. Extract before copying: the duplication gate (`.jscpd.json`)
will catch a second copy, and it would be right to.

- Move `MemoryStore`, `createDemoHost`, and the demo AI/CAS/resource adapters out of
  `react-native-web-samples/entry.tsx` into `scripts/site/browser-host/` and import them
  from both pages. No behaviour change; the existing `test:web-cookbook` run is the check.
- Add `LocalStorageStore` with the same `get`/`set`/`delete`/`list(prefix)` contract, keys
  namespaced `tp.editor.v1/`. On `QuotaExceededError` or blocked storage, fall back to the
  memory store and say so in the chrome rather than losing writes silently.
- Wire a real apps backend from the worklet-core factories rather than the samples page's
  stubs: `compile`, `format`, `diagnostics`, and `preview` come from
  `createAppsBackend*Action`, with `collectWorkspaceFiles` / `writeWorkspaceFile` reading
  through the host's workspace service.
- `package` and `publish` stay demo stubs that name what a real host would do. See §9.1 —
  this is the decision most worth revisiting.
- **Do not auto-approve confirmations.** The samples page answers
  `confirmationChannel.confirm` with `{ approved: true }`; DevStudio asks for confirmation
  on compile, package, and publish, and the authoring guide describes that dialog. Render a
  real dialog in page chrome so what a reader sees matches what the guide says.

## 4. Phase 2 — Guida compiling in the tab

This is the one genuine gap.

`loadGuidaWorklet()` in `miniapp-host-shared-backends.mjs` reaches the compiler through
`await import(".../guida-twistedpear/dist/worklet.js")` and returns `null` when that fails —
producing "Guida compiler is not available on this host". The committed
`conformance/web-devstudio/web-core.worker.js` contains zero occurrences of `guida`: it was
built before the Guida work landed, so the browser host has never actually compiled Guida.
Rebuilding it as-is would inline ~1.9 MB (1.6 MB compiler + 300 KB `elm/core` seeds) into
the main bundle, because esbuild with `outfile` and no splitting inlines dynamic imports.

Plan:

- Build `scripts/site/editor/guida-worker.ts` — a dedicated module worker wrapping
  `packages/guida-twistedpear/src/worklet.ts` behind a three-message RPC
  (`compile` / `diagnose` / `format`).
- The editor's compile, format, and diagnostics actions post to that worker. A full Elm
  compile must not run on the UI thread, and a separate entry point keeps the compiler out
  of first paint whether or not esbuild splitting is enabled.
- Fetch it lazily, on the first Guida action, with a visible "fetching the Guida compiler
  (~2 MB)" status while it downloads. A visitor who only ever opens a JavaScript sample
  never pays for it.
- Guard the split in the build script, the way `build-web-worker.mjs` guards forbidden
  imports: fail the build if the main chunk contains `compileGuidaMemory`, or if either
  chunk crosses its recorded byte budget.
- The cost is already measured, and it is affordable: hello-world Guida compiles in
  **~4 s in Chromium** (~2 s Node, ~1.3 s Bare) per `npm run test:guida-compiler`, recorded
  in [LIMITATIONS.md](../LIMITATIONS.md). Four seconds needs a progress state and a printed
  number in the docs, not a redesign. Extend `conformance/guida-compiler/measure-web.mjs`
  to record a larger project than hello-world before promising the loop feels instant.
- Desktop and mobile already pack this compiler as a host asset with seeded `elm/core` /
  `elm/json`. The web host is the only shipping host where `apps.compile` is unavailable;
  closing that gap here closes it for the web host generally, not only for this page.

## 5. Phase 3 — seeds, persistence, share links

- **Seeds.** Generate the catalog at build time from `cookbook/apps/*` with the same fixture
  reader `build-react-native-web-samples.mjs` uses (extract it alongside §3), plus the
  DevStudio JavaScript hello template and the Guida hello template from
  `packages/guida-twistedpear/templates/hello`.
- **First load.** `?app=<slug>` seeds that sample; otherwise the JavaScript hello project.
- **Persistence.** Workspace files, open file, and grants persist in localStorage across
  reloads, with a "Reset workspace" control that says what it will discard.
- **Share links.** `#w=` carries the workspace as base64url of a `deflate-raw`
  `CompressionStream` of the file map — no new dependency. Cap the encoded length
  (~64 KB); past it, offer a download instead of a broken link. A hash workspace never
  silently replaces stored work: it opens as a new project, on confirmation.
- **Deep links from the docs.** [`scripts/site/stage.mjs`](../scripts/site/stage.mjs)
  already injects "Run it in a browser" into every cookbook recipe. Extend it to inject
  "Open in the editor" → `/editor/?app=<slug>`, and add the same link to
  `authors/02-hello-world-in-devstudio.md` and `authors/04b-building-the-ui-in-guida.md`.

## 6. Phase 4 — page chrome

`scripts/site/editor/{index.html,entry.tsx}`, built by `scripts/site/build-editor.mjs` into
`site/public/editor/`, following the `/react-native-web/` precedent exactly.

Layout: DevStudio's widget tree on the left; the preview host's widget tree on the right,
driven by the `previewRef` that `createAppsBackendPreviewAction` already maintains;
diagnostics and status below; confirmation dialog as a modal; peer panel reusing
`PeerChromePanel`; share / reset / download in the header. Under 760 px the two panes stack,
matching the CSS the samples page already ships.

The accessibility gate (`conformance/accessibility`, `accessibility-ratchet.json`) applies
to the new chrome: labelled controls, roles on the dialog, focus returned after it closes.

## 7. Phase 5 — gates, verification, documentation

- `conformance/web-editor/run.mjs` (Playwright; model it on `web-cookbook/run.mjs` and
  `web-devstudio/run.mjs`): create a JS project → edit → Preview → assert the previewed
  widget tree; create a Guida project → Check → assert a diagnostic → Format → Preview →
  assert the compiled bundle renders; open a `?app=` deep link and a `#w=` share link.
  Register `test:web-editor` in `package.json` and add it to CI.
- `scripts/site/build.mjs` gains the builder step; `pages-integrity.mjs` gains the page in
  its required set; VitePress nav and sidebar gain the entry.
- Screenshots come from a real capture (`conformance/docs/capture-*` pattern). Pages builds
  already fail on placeholder screenshots for real UI, so this is not optional.
- Documentation on landing: fold what exists into [devstudio.md](devstudio.md) and
  [web-host.md](web-host.md), link it from `guide/`, `authors/02`, `cookbook/01`,
  [docs/README.md](README.md), and the site links in the top-level `README.md`; record what
  the page cannot do in [LIMITATIONS.md](../LIMITATIONS.md) (no real publish, no Reticulum
  network, demo model replies, no BLE or local peer discovery); archive this plan.
- Track the phases with `npm run work:add` (`WEBED-HOST`, `WEBED-GUIDA`, `WEBED-SEEDS`,
  `WEBED-CHROME`, `WEBED-GATE`), each with its verification command, per
  [work tracking](work-tracking.md).

## 8. Optional follow-on: a better `code-editor` widget

Syntax highlighting, line numbers, and error gutters belong in `CodeEditorWidget` in
`widget-renderer-rn`, not in page chrome. Done there, mobile and desktop DevStudio get them
too, and the widget contract (`documentId`, never file content in the tree) is unchanged.
Worth doing after the page works, and worth *not* doing before — a page-only editor would
be exactly the fork §2 avoids.

## 9. Open questions

1. **Should Package be real?** Signing runs in a browser today — `conformance/web-devstudio`
   packs and verifies a package in the page with `app-registry` + `reticulum-ts`. Making
   Package genuine would give visitors a downloadable signed `.tp` that the CLI and desktop
   host accept, turning the page into an on-ramp instead of a sandbox. Publish would stay
   stubbed either way. Current plan says stub; this is the decision to revisit first.
2. **Does the ~4 s hello-world compile hold for a real project?** The recorded Chromium
   number is for the smallest possible program. If a cookbook-sized Guida app is 15 s, the
   page needs incremental or on-demand checking rather than compile-on-Preview.
3. **Does the demo `ai:chat` adapter belong here?** Canned replies are honest on a samples
   page. In an editor, "AI edit" that always returns the same text may teach the wrong
   thing; consider hiding the AI controls rather than faking them.
4. **One page or two?** `/editor/` and `/react-native-web/` overlap. Once the editor can
   seed from any cookbook app, the samples page may be better as a read-only mode of the
   editor than as a separate build.
