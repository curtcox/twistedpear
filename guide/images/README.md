# User guide screenshots

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

This directory holds the screenshots referenced by the
[TwistedPear User Guide](../README.md). Each
screenshot is described in place in the guide, in a bold caption directly beneath its
image, and the guide renders with placeholder graphics until the real files land.

## How to supply a screenshot

1. Capture the shot described in the guide's caption for that filename.
2. Save it as PNG, at the exact filename below, in this directory.
3. Commit. Nothing else changes — the markdown already points at the right path, and
   `npm run site:build` picks the file up automatically and stops generating a placeholder
   for it.

Run `node scripts/site/section-images.mjs --report --section=guide` at any time to list which
screenshots are still missing.

## Conventions

- **PNG**, no transparency, no device frames except where the caption asks for one.
- **Desktop:** 1280×800 window captures, light theme unless stated.
- **Mobile:** portrait device screenshots at native resolution.
- **No real addresses or personal data.** Use throwaway identities. Addresses shown should
  be visibly fake but plausible.
- **Redact nothing after the fact** — set up the shot so there is nothing to redact.

## Shot list

| File | Chapter | Subject |
|---|---|---|
| `00-hero-desktop-host.png` | Index | Desktop host, fresh install |
| `01-mental-model.png` | 1 | Diagram: host, mini-apps, peers |
| `02-host-lineup.png` | 2 | The same host on five devices |
| `02-desktop-main-window.png` | 2 | Desktop host main window |
| `02-android-home.png` | 2 | Android host home screen |
| `02-ios-suspended.png` | 2 | iOS host, node suspended by iOS |
| `02-web-host-tab.png` | 2 | Web host in a browser tab |
| `03-create-identity.png` | 3 | First launch, before an identity |
| `03-identity-created.png` | 3 | Status panel after creation |
| `03-show-my-identity.png` | 3 | Address and QR code |
| `03-reset-confirmation.png` | 3 | Reset identity confirmation |
| `04-interfaces-settings.png` | 4 | Settings → Interfaces |
| `04-tcp-connected.png` | 4 | A connected TCP interface |
| `04-local-discovery.png` | 4 | Peers found automatically |
| `04-web-gateway.png` | 4 | Web host gateway connection |
| `04-ble-link.png` | 4 | Two phones over Bluetooth |
| `04-rnode.png` | 4 | An RNode LoRa radio in use |
| `04-announce-browser.png` | 4 | The announce browser |
| `05-catalog.png` | 5 | The app catalog |
| `05-install-from-256t.png` | 5 | Install from an identifier |
| `05-capability-review.png` | 5 | Capability review before install |
| `05-trusted-publishers.png` | 5 | Trusted publishers panel |
| `05-slow-install-warning.png` | 5 | Slow-link install warning |
| `06-app-running.png` | 6 | Chat running in the host |
| `06-example-apps.png` | 6 | Chat, File drop, Board |
| `06-handbook-probe.png` | 6 | Handbook live capability probe |
| `06-grants.png` | 6 | Grants panel |
| `06-host-confirmation.png` | 6 | A host confirmation prompt |
| `06-update-available.png` | 6 | An update is available |
| `06-runtime-controls.png` | 6 | Runtime controls and force quit |
| `07-chat-send.png` | 7 | Sending a message |
| `07-delivery-states.png` | 7 | Four delivery states |
| `07-propagation-role.png` | 7 | Enabling the propagation role |
| `08-sandbox-boundary.png` | 8 | Diagram: what an app can reach |
| `08-untrusted-publisher.png` | 8 | Untrusted publisher install |
| `09-storage.png` | 9 | Settings → Storage |
| `09-roles.png` | 9 | Settings → Roles |
| `09-android-notification.png` | 9 | Android node notification |
| `09-tp-node.png` | 9 | `tp node` in a terminal |
| `10-status-annotated.png` | 10 | Node status, annotated |
| `10-stalled-transfer.png` | 10 | A stalled transfer |
| `10-diagnostics.png` | 10 | Handbook diagnostics report |

## Current capture status

The deterministic desktop/browser pass supplies **17 of 42** files. Re-run it with
`npm run capture:reader-guide-ui`. It uses the real desktop renderer and built web host,
with throwaway documentation identities and no credentials.

The remaining **25** filenames are not replaced with invented screens:

- Editorial diagrams, composites, or annotations still need assembly from real captures:
  `01-mental-model.png`, `02-host-lineup.png`, `06-example-apps.png`,
  `07-delivery-states.png`, `08-sandbox-boundary.png`, `10-status-annotated.png`.
- Physical mobile/radio state is hardware-gated: `02-android-home.png`,
  `02-ios-suspended.png`, `04-ble-link.png`, `04-rnode.png`,
  `09-android-notification.png`.
- The exact captioned state is not exposed by a currently runnable documentation fixture:
  `03-reset-confirmation.png`, `04-announce-browser.png`, `04-local-discovery.png`,
  `04-tcp-connected.png`, `04-web-gateway.png`, `05-slow-install-warning.png`,
  `06-app-running.png`, `06-handbook-probe.png`, `06-update-available.png`,
  `07-chat-send.png`, `09-storage.png`, `10-diagnostics.png`,
  `10-stalled-transfer.png`.
- `09-tp-node.png` needs a clean terminal-session capture; it is intentionally not rendered
  as a fake terminal panel.
