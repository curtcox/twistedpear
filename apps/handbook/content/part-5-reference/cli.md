# CLI commands


<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

The `tp` CLI scaffolds, packs, publishes, and runs headless peers. Publisher
identity comes from `tp init` (Reticulum keypair in the project or data dir).

## Project workflow

- `tp init [--force]` — create or load publisher identity
- `tp create <hello|chat-min> [app-dir]` — scaffold a mini-app template
- `tp dev <app-dir> [--host host:port]` — build and side-load to a dev-mode host
- `tp pack <app-dir> [--out file.tpkg]` — build unsigned `.tpkg` archive
- `tp sign <file.tpkg>` — re-sign an existing package
- `tp publish <app-dir>` — pack, sign, publish to Hyperdrive
- `tp update <app-dir> --version <semver>` — bump version and republish

## Headless hosts

- `tp node` — transport/seeder/propagation peer (`--ws-listen`, `--serve-web`, …)
- `tp seed` — headless Hyperdrive seeder (`--transport`, `--state-dir`)

## Trust

- `tp trust list|show|add|remove` — manage trusted publisher keys

Handbook packaging in CI: `npm run build:handbook` then `tp pack` in a temp dir.
Tutorial: [Packaging & preview](chapter:sdk-apps-package).
