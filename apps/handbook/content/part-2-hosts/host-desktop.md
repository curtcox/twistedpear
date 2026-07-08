# Desktop host

The desktop host is the **always-on peer** in a typical mesh: transport routing,
package seeding, optional LXMF propagation, and a gateway for browser tabs via
the WebSocket Reticulum interface.

## Architecture

- **Electron shell** (`apps/host-desktop`) — tray, power events, native multicast/
  Bonjour bridges, crash supervision, DOM widget renderer.
- **Bare worklet child** — same stack as mobile; stdio IPC to the shell.
- **`host-core`** — shared engine with headless `tp node` / `tp seed`.

## Default roles

| Role | Default | Notes |
|---|---|---|
| Transport node | on | Off when `--attach-rnsd` leaf mode |
| Seeder / LAN mirror | on | Quota'd Hyperdrive serving |
| Propagation server | off | Enable in UI or `--propagation` |
| WebSocket gateway | off | `--ws-listen` for web-host tabs |

## Lifecycle

- **Suspend** (system sleep) — worklet quiesces interfaces.
- **Resume** — reconnect and re-announce.
- **Crash** — supervisor restarts the worklet with exponential backoff.

## First-boot apps

Fresh desktop installs seed **handbook**, **devstudio**, and **chat** from the
TwistedPear platform publisher. Open **Installed** and launch **handbook** — you
are reading it.

## Config & data

Platform data directory (identity, `config.json`, quotas):

- macOS: `~/Library/Application Support/TwistedPear/host`
- Linux: `~/.local/share/twistedpear/host`
- Windows: `%APPDATA%/TwistedPear/host`

Opt-in status JSON: `http://127.0.0.1:9473/status` when `--status-endpoint` is set.

Live capability view: [Live difference matrix](chapter:difference-matrix).
Details: [docs/desktop-host.md](../../../docs/desktop-host.md).
