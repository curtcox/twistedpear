# 3. Hello world with the CLI

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

The CLI path gives you your own editor, git, and a scriptable build. It produces exactly the
same package as [the DevStudio path](02-hello-world-in-devstudio.md) — a `.tpkg` records
nothing about which tool made it.

Use this path when you want version control, when your bundle needs a build step, or when you
are shipping something you intend to maintain.

## Setup

`tp` is built from the repository. Clone it, install, and build once:

```sh
git clone https://github.com/curtcox/twistedpear
cd twistedpear
npm ci
npm run build
```

`tp` is then available from the workspace.

> **⏳ Not yet available — a published `tp` package.** There is no `npm install -g
> @twistedpear/cli` and no signed binary. Every install is built from source. This is part of
> the same release-qualification work that gates published host installers; see
> [RELEASE-PLAN.md](../RELEASE-PLAN.md) and [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) H17.

## Your publisher identity

```sh
tp init
```

This creates or loads the Reticulum identity that signs everything you publish. It prints the
public key. **This key is your identity as a publisher**, and it is the sole trust root for
your apps: hosts pin it the first time they see one of your packages, and they will refuse an
update signed by anything else.

![Terminal output from tp init showing a generated publisher key](/authors/images/03-tp-init.png)

**Screenshot 3.1 — `tp init`.** A terminal at 100 columns. The command `tp init` followed by
one line of output: `Publisher identity:` and a 128-hex-character public key wrapped across
two lines. Below, the shell prompt again. Nothing else — the command is deliberately quiet.

> **⏳ Not yet available — key rotation and revocation.** If you lose this key you cannot
> update your apps, and there is no way to hand an app to a different key or revoke a
> compromised one. Multi-maintainer apps are likewise out of scope for v1. Back the identity
> file up yourself. See [docs/package-format.md](../docs/package-format.md) §1.

> **⏳ Not yet available — guided identity backup.** There is no export flow, no recovery
> phrase, and no passphrase; the key file on disk is unencrypted. See
> [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md).

## Scaffold

```sh
tp create hello my-app
```

Two templates ship: `hello` (a render-only app declaring no capabilities) and `chat-min` (a
minimal LXMF app). Both produce a directory with the same two files DevStudio uses, under
their CLI names:

```
my-app/
  app.manifest.json
  bundle.js
```

```json
{
  "name": "hello-miniapp",
  "version": "0.1.0",
  "entry": "bundle.js",
  "capabilities": [],
  "icon": null,
  "minHostApi": "0.1.0"
}
```

Pick a real `name` before you publish anything: app identity is *publisher key + name*, and
that pair is what a host pins. Reverse-DNS style (`com.example.hello`) keeps you out of
collisions with other publishers' apps in a user's catalog.

## The dev loop

```sh
tp dev my-app
```

This validates your manifest's capabilities, builds the app, and serves it to a host running
in developer mode. Point the host's developer-mode setting at the printed URL and it
side-loads; edit and it reloads.

![A host in developer mode with a side-loaded app badged DEV](/authors/images/03-dev-sideload.png)

**Screenshot 3.2 — Dev side-load.** Split image. Left: a terminal showing `tp dev my-app` and
its output — `Dev side-load ready for hello-miniapp (0.1.0)`, `Connect harness developer mode
to http://127.0.0.1:34987`, `Press Ctrl+C to stop.` Right: the desktop host running the app,
with a prominent orange **DEV** badge in the host chrome beside the app name and a tooltip
reading "Side-loaded, unsigned — not installed."

> **⚠️ Works, with limits — dev side-loading is localhost and adb only, and off by default.**
> You must enable developer mode on the host first, the connection is restricted to loopback
> (or an adb-forwarded port for a phone), and every side-loaded app is badged **DEV** in the
> UI so it can never be confused with an installed one. This is intentional; there is no
> remote side-load. See [LIMITATIONS.md §7](../LIMITATIONS.md).

## Pack, sign, publish

```sh
tp pack my-app --out my-app.tpkg   # deterministic archive, unsigned
tp sign my-app.tpkg                # re-sign an existing archive
tp publish my-app                  # pack + sign + seed + announce
```

`tp publish` is the one you will use. It packs, signs with your publisher identity, creates or
opens the app's Hyperdrive, publishes the version, computes the 256t identifier, signs a
content locator, and announces the app. It prints three things you care about:

```
Published 0.1.0 to drive 8f3c…
Announced hello-miniapp.…
256t: <94 characters>
```

That last string is what you give people. [Chapter 9](09-packaging-and-publishing.md) explains
what is inside it.

To ship a new version:

```sh
tp update my-app --version 0.2.0
```

That bumps `app.manifest.json` and republishes in one step. Versions must increase — a host
rejects a downgrade at catalog ingest and at install ([Chapter 10](10-updates-and-trust.md)).

## Seeding what you published

Publishing announces your app, but the bytes have to live somewhere reachable. If your
workstation is not going to stay online, run a node or a seeder that will:

```sh
tp node --data-dir ~/.local/share/twistedpear/host
tp seed --transport --state-dir .tp/seeder
```

`tp node` runs a desktop-class host — transport, seeding, optionally propagation, optionally a
WebSocket listener for browser hosts and a served web host. `tp seed` is the headless
subset: keep archives available without running a full node. Both are documented in
[docs/desktop-host.md](../docs/desktop-host.md).

If nothing is seeding your app and no peer has cached it, the 256t string you handed out
resolves for nobody.

## Managing trust

```sh
tp trust list
tp trust add <256t identity string> --label "Alice"
tp trust show <key>
tp trust remove <key-or-256t>
```

Trusting a publisher changes the *acceptance experience* for their apps — a one-confirmation
install with a "Trusted" badge instead of the full warning flow. It does **not** skip the
capability review, which is always shown, and it does not weaken first-seen key pinning. See
[docs/256t-distribution.md](../docs/256t-distribution.md).

## Working from the examples

The three reference apps in [apps/examples](../apps/examples/README.md) are small enough to read
in full and each demonstrates one slice of the SDK:

| App | Demonstrates | Size |
|---|---|---|
| `chat` | `identity`, `lxmf:send`, `lxmf:receive`, `storage:kv` | ~2.6 KiB |
| `file-drop` | `resource:fetch` plus KV storage | ~1.8 KiB |
| `board` | `announce:publish`/`subscribe` plus Hyperbee | ~2.1 KiB |

```sh
npm run build
npm run test:examples
```

That suite drives all three through the package, install, and runtime paths — the fastest way
to confirm your toolchain is working before you blame your own code.
