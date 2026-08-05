# Publish, install & update

<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

Distribution is a three-step loop: **package** a signed `.tpkg`, **publish** its
256t id under your publisher identity, and **install** on any host that discovers
the announce. **Update** is the same path with a bumped semver — the host fetches
the newer archive and replaces the installed copy.

## Why confirmations exist

`apps:publish` and `apps:install` are double-gated: the manifest must declare the
capability and the host shows a confirmation on every call. That mirrors how end
users experience installs outside DevStudio.

## Publish & install

```javascript
import { apps } from "@twistedpear/miniapp-sdk";

const packed = await apps.packageProject("my-app", manifest);
await apps.publish(packed.t256);
const installed = await apps.install(packed.t256);
```

See [Publish & install](chapter:sdk-apps-publish) for the first-install probe.

## OTA update

Bump `version` in the manifest, repack, and publish again. Hosts that already
installed the app resolve the new 256t id through Hyperdrive or Resource fallback.

```javascript
const manifestV2 = { ...manifest, version: "0.2.0" };
await workspace.write("my-app/app.json", JSON.stringify(manifestV2, null, 2));
const packedV2 = await apps.packageProject("my-app", manifestV2);
await apps.publish(packedV2.t256);
const updated = await apps.install(packedV2.t256);
```

CLI equivalent: `tp update <app-dir> --version <semver>` — see
[CLI commands](chapter:ref-cli).

## Live probe

{{applet:apps-update}}

Transport budgets for large packages: [Budgets & quotas](chapter:sdk-budgets).
Package format: [Package format](chapter:ref-packages).
