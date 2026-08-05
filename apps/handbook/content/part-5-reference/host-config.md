# Host configuration


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Generated from `defaultHostConfig()` defaults in `packages/host-core`.
Desktop and `tp node` persist overrides in `<data-dir>/config.json`.

## Data directory

- macOS: `~/Library/Application Support/TwistedPear/host`
- Linux: `~/.local/share/twistedpear/host`
- Windows: `%APPDATA%/TwistedPear/host`
- Identity: `<data-dir>/identity`
- Config: `<data-dir>/config.json`

Platform paths: [Desktop host](chapter:host-desktop). Headless flags:
[CLI commands](chapter:ref-cli).

## Roles (desktop defaults)

- Transport node: true
- Seeder / LAN mirror: true
- Propagation server: false
- Attach to external rnsd: off

Web hosts force leaf roles — see [Web host](chapter:host-web).

## Interfaces (desktop defaults)

- TCP client: off (target 127.0.0.1:4242)
- WebSocket gateway: off (listen 127.0.0.1:9480)
- AutoInterface multicast: true
- Bonjour discovery: true
- I2P SAM: false
- RNode serial: false

Interface behavior: [Network interfaces](chapter:ref-interfaces).

## Quotas

Seed storage, propagation store, message count, and bandwidth caps match
[Quotas & limits](chapter:ref-quotas). Override under the `quotas` key.

## AI endpoint

`ai` is `null` until configured (desktop **Settings → AI** or `config.json`). Chat and
embedding models are configured separately. Mini-apps use `ai:chat` and `ai:embed` through
the host proxy — see [AI chat](chapter:sdk-ai-chat).

## Status endpoint

Opt-in JSON at `http://127.0.0.1:9473/status` when `statusEndpoint: true`
or `tp node --status-endpoint`.
