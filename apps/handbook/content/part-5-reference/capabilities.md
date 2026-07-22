# Capabilities


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Generated from `CAPABILITY_DEFINITIONS` in `packages/miniapp-runtime`.
Every id below must be exercised by at least one Handbook applet (coverage gate).

- **`identity`** — Use an app-scoped identity for signing and addressing.
- **`presence`** — Read coarse peer/interface presence and host info.
- **`announce:subscribe`** — Receive announces in the app namespace.
- **`announce:publish`** — Publish the app destination.
- **`lxmf:send`** — Send LXMF messages from the app destination.
- **`lxmf:receive`** — Receive LXMF messages for the app destination.
- **`storage:kv`** — Store local key/value data for this app.
- **`storage:hyperbee`** — Store ordered local Hyperbee data for this app.
- **`resource:fetch`** — Fetch package resources through host budget rules.
- **`workspace`** — Read and write project source files in this app's private workspace.
- **`ai:chat`** — Send prompts to the host-configured AI service; prompts may include workspace content.
- **`ai:embed`** — Send bounded text to the host-configured embedding model and rank vectors locally.
- **`apps:package`** — Package and sign apps under this device's publisher identity (asks each time).
- **`apps:publish`** — Publish signed apps so other users can find and install them (asks each time).
- **`apps:install`** — Ask the host to install apps from a 256t id (asks each time, with capability review).
- **`apps:preview`** — Run a built app in the host's sandboxed dev-preview slot.
- **`share:cas`** — Store and retrieve bounded content-addressed data shared by 256t id.
- **`peer:connect`** — Ask trusted host chrome to find, confirm, and connect an app-scoped peer.

Manifests declare the full list; users may grant a subset at install.
Withholding a capability turns matching probes into `not-granted` cards.

Tutorial: [Capability model](chapter:sdk-capabilities).
Per-namespace guides: [Developing mini-apps](chapter:sdk-identity).
