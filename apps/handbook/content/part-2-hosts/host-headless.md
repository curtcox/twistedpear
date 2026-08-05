# Headless node & seeder

<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

`tp node` and `tp seed` run **`host-core`** without a UI — the same engine as the
desktop worklet, suitable for servers, CI, and LAN gateways.

## `tp node`

Always-on desktop-class peer from the CLI:

```bash
tp node --data-dir ~/.local/share/twistedpear/host
tp node --ws-listen 9480 --serve-web
tp node --attach-rnsd 127.0.0.1:4242 --no-transport
tp node --propagation --status-endpoint
```

Common flags:

- `--no-transport` / `--no-seeder` — leaf or attach-only modes
- `--ws-listen [host:]port` — WebSocket gateway for browser tabs
- `--ws-token <token>` — optional shared secret on the gateway
- `--serve-web [dir]` — serve the built web-host bundle from this machine
- `--status-endpoint` — localhost JSON status on port 9473

## `tp seed`

Headless package mirror focused on Hyperdrive seeding:

```bash
tp seed --transport --state-dir .tp/seeder
```

Use when you want seeding without the Electron shell. Quotas match desktop defaults
(see [Quotas & limits](chapter:ref-quotas)).

## When to use headless vs desktop

| Need                           | Headless                | Desktop host           |
| ------------------------------ | ----------------------- | ---------------------- |
| WebSocket gateway for web tabs | `tp node --ws-listen`   | enable in config / CLI |
| Tray UI + crash supervision    | —                       | Electron shell         |
| CI / docker interop            | `tp node` in containers | optional               |
| Developer mini-app side-load   | `tp dev` targets either | `tp dev`               |

## Handbook on node

CI runs the Handbook with `npm run test:handbook` — pack, install, render every
chapter, execute applets on the Node Worker sandbox backend. This is the same
catalog desktop seeds, without graphics.

CLI reference: [CLI commands](chapter:ref-cli).
