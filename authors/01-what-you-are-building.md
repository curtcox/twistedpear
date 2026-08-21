# 1. What you are building

<!-- tp-doc
lifecycle: live
audited: 2026-08-20
register: none
-->

A TwistedPear mini-app is a **single JavaScript file** that runs in a sandbox, talks to
exactly one thing — the host broker — and describes its user interface as data rather than
drawing it.

That is the whole model. The rest of this chapter is why each of those three constraints
exists, because each one will shape code you write later.

![Diagram: mini-app, sandbox, broker, host services, network](/authors/images/01-architecture.png)

**Screenshot 1.1 — Where your code sits.** A layered diagram. Innermost box, labelled "Your
mini-app (bundle.js)", sits inside a box labelled "Sandbox — Bare Worker". A single arrow
leaves the sandbox through a narrow gate labelled "Broker (the only doorway)". Past the gate,
a row of host service boxes: Identity, LXMF, Announce, Storage, Resource, Presence,
Workspace, AI, Apps, Share. Below those, "Reticulum network stack" and "Hyperdrive". A second
arrow returns from the host to the sandbox labelled "UI events". Crossed-out labels outside
the sandbox read `fs`, `net`, `require`, `Bare APIs`, each with a red line through it.

## One import

Your app imports `@twistedpear/miniapp-sdk` and nothing else.

```javascript
import { identity, lxmf, storage, ui } from "@twistedpear/miniapp-sdk";
```

```elm
import TwistedPear.Sdk.Identity as Identity
import TwistedPear.Sdk.Lxmf as Lxmf
import TwistedPear.Sdk.StorageKv as StorageKv
```

Guida apps import `TwistedPear.Sdk.*` modules instead of the JavaScript package. The compiled
bundle still talks to the same broker. There is no filesystem, no socket, no `require`, no
`fetch`, and no access to the host's Bare APIs. Not "discouraged" — absent. If you reach for
something outside the SDK, the code will not resolve, and if you smuggle it in the sandbox
has nothing to give you.

This is what makes the security story checkable. Every capability a mini-app has must have
crossed the broker, and the broker validates request size, per-app message rate, the
capabilities your signed manifest declares, and the grants the user actually approved —
before it dispatches anything. See
[docs/miniapp-runtime.md](../docs/miniapp-runtime.md) for the enforcement details.

## The UI is data

You do not render. You submit a **widget tree** — a plain JSON object — and the host renders
it natively on whatever it happens to be: Electron on the desktop, React Native on a phone, a
sandboxed iframe in a browser.

```javascript
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
      {
        id: "go",
        type: "button",
        props: { label: "Tap me", event: "hello.tap" },
      },
    ],
  },
});
```

Events come back the other way:

```javascript
ui.onEvent(async ({ event, value }) => {
  if (event === "hello.tap") {
    await render();
  }
});
```

```elm
view : Model -> Widget Msg
view model =
    W.view "root" [ S.padding 16, S.gap 8 ]
        [ W.text "title" [ S.fontSize 20 ] "Hello"
        , W.button "go" [] { label = "Tap me", onPress = Tapped, event = "hello.tap" }
        ]
```

The Guida `view` function is the same tree: node ids, types, and event names must match a JavaScript twin. See [Chapter 4b](04b-building-the-ui-in-guida.md).

Two consequences worth internalising now:

- **You get the host's look, not yours.** The component and style allowlists are closed
  ([Chapter 4](04-building-the-ui.md)). You cannot ship CSS, fonts, or arbitrary drawing.
  This is a deliberate trade: it is also why a hostile app cannot draw a fake host dialog.
- **Your app is a state machine that re-renders.** There is no reconciler binding today; you
  call `ui.render` with a fresh tree and the host diffs it for you.

> **⏳ Not yet available — a React binding.** A custom reconciler emitting the same widget
> protocol is designed but not built, and it is explicitly non-blocking for v1. The
> declarative renderer is the supported UI. See
> [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) — optional and non-blocking backlog.

## Capabilities are declared, then granted

Your manifest lists the capabilities your app needs. At install, the user sees that list in
plain language and can **grant a subset**. Every SDK call without a matching grant fails with
a typed `CapabilityError` — not silently, not with a zero value.

```json
{
  "name": "chat",
  "version": "0.1.0",
  "entry": "bundle.js",
  "capabilities": ["identity", "lxmf:send", "lxmf:receive", "storage:kv"],
  "icon": null,
  "minHostApi": "0.1.0"
}
```

Grants are keyed by `appId + publisherPublicKey`, survive updates signed by the same
publisher, and are deleted on uninstall. The user can also toggle capabilities at each
launch, not just at install — so "granted once" is not an assumption you may make.
[Chapter 5](05-capabilities.md) covers designing for a partial grant.

## A package is content, not a location

Publishing produces a deterministic `.tpkg` archive — no timestamps, files in lexicographic
order — signed with your publisher identity. It is addressed by a **256t identifier**: a
94-character string that is a fingerprint of the bytes.

Whoever you hand that string to cannot use it to give someone else different bytes. If the
content does not hash to the identifier, the install is refused. There is no registry to
compromise because there is no registry at all.

The cost of that is discovery: your app reaches people only if a peer they are connected to
has announced it. [Chapter 9](09-packaging-and-publishing.md) covers publishing;
[LIMITATIONS.md §7](../LIMITATIONS.md) covers why there will not be a store.

## What a mini-app cannot be

Read this list before you design, not after.

| You cannot                                                | Because                                                                     |
| --------------------------------------------------------- | --------------------------------------------------------------------------- |
| Ship native code or link a native module                  | The sandbox runs JavaScript only.                                           |
| Run while TwistedPear itself is not on screen             | The OS suspends the whole host app. On iOS this is permanent.               |
| Share storage with another mini-app                       | A channel copies messages; each app's store stays its own.                  |
| Open a socket, read a file, or call an arbitrary HTTP API | Everything goes through the broker; there is no general network capability. |
| Assume a fast link                                        | A peer may be reachable only over LoRa at hundreds of bits per second.      |
| Assume you are online                                     | Peers appear and disappear; LXMF delivery may be deferred for hours.        |
| Draw over a host confirmation dialog                      | Those render in host chrome, outside your widget container.                 |

The last one is a feature you benefit from: users can trust the install and publish prompts
precisely because no app can forge them.

Mobile operating systems suspend the **host app** — they do not limit how many mini-apps a
running host may hold. Several mini-apps may run at once, and they may talk through a
brokered `apps:channel` after both sides grant the named destination. They still do not
share storage, and they are told nothing about suspend/resume. The full ledger is
[docs/mobile-lifecycle.md](../docs/mobile-lifecycle.md).

Design for a suite that may exist later. Do not assume you are the only app on the host.

> **⚠️ Works, with limits — the sandbox boundary is JavaScript-level.** The broker
> chokepoint, deny-by-default grants, and data-only UI are implemented and covered by the
> hostile-input suite, and a software-tier adversarial review is complete
> ([docs/security-review.md](../docs/security-review.md)). But JS-level isolation may not
> resist a determined escape on all hardware, and Bare Worker hostile parity has never been
> measured on a physical device (H11). Treat "the sandbox contains a hostile app" as strong
> on desktop, unproven on phones. See [LIMITATIONS.md §7](../LIMITATIONS.md).

## The shape of the loop

Whichever path you take, the loop is the same six steps:

1. **Write** a single `bundle.js` plus a manifest.
2. **Preview** it in a sandboxed slot with the grants you approve.
3. **Package** it — deterministic archive, per-file hashes.
4. **Sign** it with your publisher identity.
5. **Publish** it — seed the archive, announce the app, get a 256t string.
6. **Hand someone the string.** They review the capabilities and install.

[Chapter 2](02-hello-world-in-devstudio.md) walks that loop inside TwistedPear.
[Chapter 3](03-hello-world-with-the-cli.md) walks it from a terminal.
