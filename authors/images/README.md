# App authoring guide screenshots

<!-- tp-doc
lifecycle: live
audited: 2026-08-19
register: none
-->

This directory holds the screenshots referenced by the
[TwistedPear App Authoring Guide](../README.md). Each
screenshot is described in place in the guide, in a bold caption directly beneath its image.
Only the hardware-pending filenames below still render as a generated hatch PNG.

## How to supply a screenshot

1. Capture the shot described in the guide's caption for that filename.
2. Save it as PNG, at the exact filename below, in this directory.
3. Commit. Nothing else changes — the markdown already points at the right path, and
   `npm run site:build` picks the file up automatically and stops generating a placeholder for
   it.

Run `node scripts/site/section-images.mjs --report --section=authors` at any time to list
which screenshots are still missing.

## Conventions

These match the [user guide's conventions](../../guide/images/README.md), with two additions
for authoring shots.

- **PNG**, no transparency, no device frames except where the caption asks for one.
- **Desktop:** 1280×800 window captures, light theme unless stated.
- **Mobile:** portrait device screenshots at native resolution.
- **No real addresses or personal data.** Use throwaway identities. Addresses and key
  fingerprints shown should be visibly fake but plausible.
- **Redact nothing after the fact** — set up the shot so there is nothing to redact.
- **Code in editors must be the code the guide quotes**, character for character. A reader
  comparing the screenshot to the snippet above it should find them identical.
- **Never show a real AI API key, endpoint, or model credential**, including in a settings
  panel visible behind a dialog. The host holds these outside the sandbox and they must not
  appear in documentation.

## Shot list

| File                          | Chapter | Subject                                                    |
| ----------------------------- | ------- | ---------------------------------------------------------- |
| `00-hero-devstudio.png`       | Index   | DevStudio mid-edit, editor plus live preview               |
| `01-architecture.png`         | 1       | Diagram: mini-app, sandbox, broker, host services          |
| `02-install-devstudio.png`    | 2       | DevStudio's capability review at install                   |
| `02-new-project.png`          | 2       | A freshly seeded hello project                             |
| `02-ai-edit.png`              | 2       | An AI proposal shown as a whole-file diff                  |
| `02-preview-grants.png`       | 2       | The preview-slot confirmation with a subset of grants      |
| `02-web-editor.png`           | 2       | DevStudio running in the documentation-site browser editor |
| `02-package-256t.png`         | 2       | The packaged app's QR code and 256t string                 |
| `02-installed-on-phone.png`   | 2       | The published app running on a phone                       |
| `03-tp-init.png`              | 3       | `tp init` printing a publisher public key                  |
| `03-publisher-recovery.png`   | 3       | Host-owned publisher backup and recovery words             |
| `03-dev-sideload.png`         | 3       | `tp dev` terminal beside a host showing the **DEV** badge  |
| `04-component-gallery.png`    | 4       | One widget tree rendered on desktop, Android, and web      |
| `04-render-rejection.png`     | 4       | A rejected widget tree; previous tree retained             |
| `05-capability-review.png`    | 5       | A mini-app grant screen with one capability toggled off    |
| `06-runtime-storage.png`      | 6       | Runtime controls: KV quota, rate limit, memory limit       |
| `07-announce-peers.png`       | 7       | An app listing peers discovered via announces              |
| `08-host-confirmation.png`    | 8       | A publish confirmation in host chrome, app dimmed behind   |
| `09-publish-result.png`       | 9       | Publish result: identifier, QR code, size, seeding status  |
| `10-update-available.png`     | 10      | A catalog card offering an update to an installed app      |
| `11-runtime-controls.png`     | 11      | Lifecycle state, live counters, and force quit             |
| `12-slow-install-warning.png` | 12      | The "this will take a while" warning on a radio link       |
| `13-package-summary.png`      | 13      | The final pre-publish summary panel                        |

## Current capture status

The deterministic host-chrome pass supplies **20 of 22** files. Re-run it with
`npm run capture:reader-guide-ui`.

The remaining **2** filenames need surfaces the current capture fixture cannot
produce without hardware, and are not replaced with invented screens:

- `04-component-gallery.png` — the same widget tree on desktop, Android, and
  web with each host's native controls. Desktop and web widget renderers exist;
  the Android panel needs a phone (emulator or device) showing native RN
  controls of that tree, which the Playwright host-chrome fixture cannot emit.
- `02-installed-on-phone.png` — a published hello-app running on a phone with
  host chrome and two interfaces online. Do not ship a screenshot of a real
  handset (H-tier). An emulator dump would still be a developer harness, not
  the consumer status-bar chrome the caption describes.
