# 2. Hello world in DevStudio

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

DevStudio is a mini-app development environment that is **itself a mini-app**. It is
packaged, signed, and distributed exactly like anything else you would install, it runs in
the standard sandbox, and it can package and publish any project in its workspace —
including a copy of itself.

That is not a stunt. It is the proof that the authoring capabilities are ordinary
capabilities: if DevStudio can be built out of the SDK, so can whatever you are building.

This chapter takes you from an empty host to a published app without installing a toolchain.

## Getting DevStudio

DevStudio ships with the host and appears in your catalog. Install it the way you install
anything else — see [User Guide chapter 5](../guide/05-finding-and-installing-apps.md).

![The capability review for DevStudio](/authors/images/02-install-devstudio.png)

**Screenshot 2.1 — Installing DevStudio.** The standard capability review modal, headed
"Install DevStudio?", with the publisher fingerprint and a "Trusted" badge at the top. The
capability list is longer than most apps': "Read and write project source files", "Send
prompts to the AI service", "Package and sign apps (asks each time)", "Publish apps (asks
each time)", "Install apps (asks each time)", "Run an app in the preview slot", "Share
content by identifier", "Store local data" — each with its own toggle, all on. A note beneath
the AI row reads "Prompts may include your workspace content." Buttons: **Install**,
**Cancel**.

Every one of those is optional. Without `ai:chat` the editor still works. Without
`apps:publish` you have a local-only IDE. Grant what you want.

## New project

**New project → hello** seeds two files into your workspace. **New Guida project**
seeds `elm.json` plus `src/Main.elm`; you can add further `.elm` modules, Format the
open file, and Check for compiler problems before Preview.

```
hello-app/app.json
hello-app/bundle.js
```

![DevStudio just after seeding a hello project](/authors/images/02-new-project.png)

**Screenshot 2.2 — A freshly seeded project.** DevStudio at 1280×800. Left rail: a file tree
with `hello-app` expanded showing `app.json` and `bundle.js`, `bundle.js` highlighted.
Centre: the `code-editor` widget containing the eight-line hello bundle, line numbers
visible, syntax coloured. Right: an empty **Preview** panel with the placeholder text "Not
running — press Preview." Toolbar shows **New project**, **AI edit**, **Preview**, **Package
& sign**, **Publish**, with the last two greyed out until the project has been previewed at
least once.

`app.json` is the project's manifest source. `bundle.js` is your app:

```javascript
import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 8 },
    children: [
      {
        id: "title",
        type: "text",
        props: { value: "Hello" },
        style: { fontSize: 20 },
      },
    ],
  },
});
```

## Editing

The editor is the `code-editor` widget. It is **content-by-reference**: the widget tree
DevStudio submits carries only a `documentId`, not your file's text. The host resolves the
content from the workspace, your keystrokes come back as events, and DevStudio persists them
with conflict-checked `workspace.patch` calls.

Files remain capped at **256 KiB** as a host safety quota, but editor events carry only the
changed UTF-16 range plus its expected base length. A concurrent change fails instead of
being silently overwritten.

> **⚠️ Works, with limits — one file, no bundler.** DevStudio projects are single-file
> bundles. There is no in-host bundler, so `import` works only for
> `@twistedpear/miniapp-sdk`. You cannot split your app across modules or pull an npm
> dependency. If you need that, build the bundle outside and use
> [the CLI path](03-hello-world-with-the-cli.md). See
> [LIMITATIONS.md §7](../LIMITATIONS.md).

Add a button and some state:

```javascript
import { ui } from "@twistedpear/miniapp-sdk";

let taps = 0;

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 8 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "Hello" },
          style: { fontSize: 20 },
        },
        { id: "count", type: "text", props: { value: `Taps: ${taps}` } },
        {
          id: "go",
          type: "button",
          props: { label: "Tap me", event: "hello.tap" },
        },
      ],
    },
  });
}

ui.onEvent(async ({ event }) => {
  if (event === "hello.tap") {
    taps += 1;
    await render();
  }
});

await render();
```

## AI-assisted editing

Describe a change in plain language and DevStudio sends the current file plus your request to
`ai.chatStream`. The host holds the endpoint URL, the API key, and the model allowlist — desktop
**Settings → AI**, or `HostConfig.ai` for a headless node. **The key never enters any
sandbox**, including DevStudio's.

![The AI edit panel showing a proposed whole-file replacement](/authors/images/02-ai-edit.png)

**Screenshot 2.3 — Reviewing an AI proposal.** A panel below the editor. At the top, a text
input containing "add a reset button that sets taps back to zero". Below it, a two-column
diff: the current `bundle.js` on the left, the proposal on the right with four added lines
highlighted green. Beneath the diff, the model name and a token count. Buttons: **Apply**,
**Reject**. A grey note reads "Whole-file replacement — review before applying."

> **⚠️ Works, with limits — AI editing streams a whole-file replacement.** You can watch the
> proposed file arrive, but **Apply** stays disabled until the stream completes. There is no
> partial patch or multi-file edit. One request may be in flight per app, at most 64
> messages, with `maxTokens` clamped to 8,192 by the host. See
> [LIMITATIONS.md §7](../LIMITATIONS.md).

If no AI endpoint is configured, or you did not grant `ai:chat`, the panel is absent and the
rest of DevStudio is unaffected.

## Preview

**Preview** runs your project in a second, fully independent host slot — its own broker, its
own in-memory grant store under a `dev-preview:` publisher key. Your DevStudio session keeps
running while the preview does.

Because it is a separate sandbox with real capability gating, a preview will deny a call your
grants do not cover, exactly like a real install. That is the point: it is a rehearsal, not a
simulation.

![The preview confirmation dialog listing grants to approve](/authors/images/02-preview-grants.png)

**Screenshot 2.4 — Approving preview grants.** A host-chrome confirmation modal titled "Run
hello-app in the preview slot?" showing the requesting app ("DevStudio") and its publisher
fingerprint at the top. Below, the grants the preview is asking for, checkboxes: "Store local
data" checked, "Send messages" unchecked by the user. A line reads "Grants must be a subset
of the app's declared capabilities." Buttons: **Run preview**, **Cancel**. The DevStudio
window behind is visibly dimmed and non-interactive.

> **⚠️ Works, with limits — one preview slot.** Previewing again replaces the previous
> preview. You cannot run two versions side by side. See [LIMITATIONS.md §7](../LIMITATIONS.md).

## Package and sign

**Package & sign** builds the deterministic `.tpkg`, signs it with this device's publisher
identity, stores it in the local content-addressed store, and shows you the 94-character 256t
string.

This raises a host confirmation — a dialog drawn in host chrome, outside DevStudio's widget
surface, showing the requesting app and the publisher key fingerprint. DevStudio has no
component capable of drawing over it or acknowledging it, and the confirmation token never
transits the broker. Every `apps:*` operation works this way, every time; the grant alone is
not enough.

![The 256t identifier shown as a QR code after packaging](/authors/images/02-package-256t.png)

**Screenshot 2.5 — A packaged app.** A result panel showing the app name and version
("hello-app 0.1.0"), the package size in bytes, the package hash truncated with a copy
button, and a large scannable QR code. Beneath the QR, the full 94-character 256t string in
monospace, wrapped over two lines, with a **Copy** button. A caption reads "Anyone with this
string can install exactly these bytes — and nothing else."

## Publish

**Publish** — a second host confirmation — seeds the archive on your existing transports and
announces the app together with its content locator. Now a peer connected to you can resolve
that 256t string.

## Installing it on the other device

On another device: trust your publisher identity (scan or paste your identity string), paste
or scan the app's 256t string, review the requested capabilities, install, and run.

![The published app running on a phone](/authors/images/02-installed-on-phone.png)

**Screenshot 2.6 — The result.** Portrait phone screenshot at native resolution. The app
fills the screen: "Hello" as a heading, "Taps: 3" beneath it, and a **Tap me** button. Host
chrome at the top shows the app name and a **Force quit** control. The status bar shows the
host connected with two interfaces online.

> **⚠️ Works, with limits — the locator must already have been announced.** A 256t string
> resolves only if the receiving host has already heard an announce telling it where those
> bytes live. There is no locator re-request yet, so if nobody near them carries it, the
> install cannot proceed and the host cannot go looking. See
> [LIMITATIONS.md §7](../LIMITATIONS.md).

> **⚠️ Works, with limits — desktop scanning depends on Chromium.** Desktop host chrome can
> scan with `BarcodeDetector` after camera permission; paste remains the fallback when the
> API or camera is unavailable. See [LIMITATIONS.md §7](../LIMITATIONS.md).

## What the loop is validated against

`npm run test:devstudio-loop` runs this entire chapter automatically on one machine: instance
A edits directly and via a mock AI endpoint, previews, packages, and publishes; instance B
trusts A, resolves the 256t string over a real Reticulum link, reviews capabilities while
granting only a subset, installs, runs, observes a capability denial, tightens resource
limits, and force-quits. If something in this chapter breaks, that suite is where it surfaces
first. See [conformance/devstudio-loop](../conformance/devstudio-loop/README.md).

## Moving a project to the CLI

Copy `bundle.js` out of the workspace, rename `app.json` to `app.manifest.json`, and you have
a directory `tp pack` accepts. Nothing else changes. [Chapter 3](03-hello-world-with-the-cli.md)
picks it up from there.
