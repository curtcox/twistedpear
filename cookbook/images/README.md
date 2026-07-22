# Cookbook screenshots

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

This directory holds the screenshots referenced by the [TwistedPear Cookbook](../README.md).
Each screenshot is described in place in the cookbook, in
a bold caption directly beneath its image, and the cookbook renders with placeholder graphics
until the real files land.

## How to supply a screenshot

1. Capture the shot described in the cookbook's caption for that filename. The caption is the
   spec — it names the surface, the state the app must be in, and what the shot is meant to
   demonstrate.
2. Save it as PNG, at the exact filename below, in this directory.
3. Commit. Nothing else changes — the markdown already points at the right path, and
   `npm run site:build` picks the file up automatically and stops generating a placeholder for
   it.

Run `node scripts/site/section-images.mjs --report --section=cookbook` at any time to list
which screenshots are still missing.

## Conventions

Identical to the [user guide](../../guide/images/README.md) and
[authoring guide](../../authors/images/README.md) shot lists:

- **PNG**, no transparency, no device frames except where the caption asks for one.
- **Desktop:** 1280×800 window captures, light theme unless stated.
- **Mobile:** portrait device screenshots at native resolution.
- **No real addresses or personal data.** Use throwaway identities. Addresses shown should be
  visibly fake but plausible.
- **Redact nothing after the fact** — set up the shot so there is nothing to redact.

Three conventions specific to this section:

- **Host chrome must stay visible.** Every capture of a running app should show the host frame
  around the mini-app surface, because a recurring point of the cookbook is the boundary
  between the two.
- **Composites are captured as separate shots and assembled.** Where a caption asks for a grid
  or a side-by-side, capture each panel at the same size and compose them; do not shrink one
  window.
- **Populate with realistic content.** An empty list demonstrates nothing. Every app in a shot
  should be several interactions in.

## Shot list

| File | Chapter | Subject |
|---|---|---|
| `00-hero-cookbook.png` | Index | Nine cookbook apps in a 3×3 grid |
| `01-dev-install.png` | 1 | A side-loaded sample badged **DEV** in the host app list |
| `01-devstudio-paste.png` | 1 | A sample pasted into DevStudio, previewing |
| `01-capability-review.png` | 1 | The install-time capability review for Net ledger |
| `02-chapter-opener.png` | 2 | Three zero-capability apps, plus a Grants panel showing no requests |
| `02-unit-converter.png` | 2 | Unit converter mid-conversion |
| `02-dice-table.png` | 2 | Dice table with a capped roll history |
| `02-breath-pacer.png` | 2 | Breath pacer mid-cycle with its progress bar |
| `03-chapter-opener.png` | 3 | The four storage apps, plus a per-app quota bar |
| `03-pocket-notes.png` | 3 | Pocket notes with unsaved changes |
| `03-revoked-grant.png` | 3 | Grants panel with storage revoked, beside the app reacting live |
| `03-streak-tracker.png` | 3 | Streak tracker showing a nine-day streak |
| `03-field-log.png` | 3 | Field log with timestamped observations, newest first |
| `03-split-the-bill.png` | 3 | Split the bill with a settle-up summary |
| `04-chapter-opener.png` | 4 | The three messaging apps, each showing its own app address |
| `04-signal-check.png` | 4 | Signal check with completed and outstanding round trips |
| `04-roll-call.png` | 4 | Roll call with a partially answered roster |
| `04-dead-drop.png` | 4 | Dead drop with a received signed note |
| `05-chapter-opener.png` | 5 | The three discovery apps, plus the host's announce browser |
| `05-neighborhood-board.png` | 5 | Neighborhood board with posts from three addresses |
| `05-swap-shelf.png` | 5 | Swap shelf showing the live payload byte budget |
| `05-link-weather.png` | 5 | Link weather's device readout in the deterministic web demo |
| `06-chapter-opener.png` | 6 | The three file apps, plus a host transfer rate readout |
| `06-photo-drop.png` | 6 | Photo drop with a 256t identifier as a QR code |
| `06-photo-drop-scan.png` | 6 | The same identifier being scanned by a phone host |
| `06-zine-reader.png` | 6 | Zine reader on page three, served from cache |
| `06-recipe-box.png` | 6 | Recipe box with a file list and an open editor |
| `07-chapter-opener.png` | 7 | The three model apps, one working with no IP connectivity |
| `07-pocket-translator.png` | 7 | Pocket translator answering from its local phrasebook |
| `07-ask-the-handbook.png` | 7 | Ask the handbook with a cited answer |
| `07-triage-notes.png` | 7 | Triage notes mid-review, before filing |
| `08-host-confirmation.png` | 8 | A packaging confirmation the app cannot draw over |
| `08-chapter-opener.png` | 8 | The three `apps:*` recipes |
| `08-sticker-mill.png` | 8 | Sticker mill with a packaged identifier and QR code |
| `08-form-forge.png` | 8 | Form forge with a designed field list awaiting review |
| `08-app-relay.png` | 8 | App relay with heard app announces and a trust list |
| `09-chapter-opener.png` | 9 | The three constrained apps on an RNode-only host |
| `09-nine-line.png` | 9 | Nine line with its byte counter over budget, in red |
| `09-beacon-lite.png` | 9 | Beacon lite showing its payload size and deterministic demo peers |
| `09-net-ledger.png` | 9 | Net ledger with a check-in roster and a held outbox |

Forty shots. The chapter openers are the most work — five of them are composites — and the
most valuable, because they are the images that carry the cookbook's actual argument: that
these apps do not look alike.

## Current capture status

The deterministic host/runtime pass supplies **37 of 40** files:
`00-hero-cookbook.png`, `01-dev-install.png`, `01-devstudio-paste.png`,
`01-capability-review.png`, `02-chapter-opener.png`,
`02-unit-converter.png`,
`02-breath-pacer.png`, `02-dice-table.png`, `03-pocket-notes.png`,
`03-chapter-opener.png`, `03-field-log.png`, `03-revoked-grant.png`,
`03-split-the-bill.png`, `03-streak-tracker.png`, `04-chapter-opener.png`,
`04-dead-drop.png`, `04-roll-call.png`, `04-signal-check.png`,
`05-chapter-opener.png`, `05-neighborhood-board.png`, `05-swap-shelf.png`,
`05-link-weather.png`, `06-chapter-opener.png`, `06-photo-drop.png`,
`06-recipe-box.png`, `06-zine-reader.png`,
`07-pocket-translator.png`, `07-ask-the-handbook.png`, `07-triage-notes.png`,
`08-chapter-opener.png`, `08-app-relay.png`, `08-form-forge.png`, `08-host-confirmation.png`,
`08-sticker-mill.png`, `09-nine-line.png`, `09-beacon-lite.png`, and `09-net-ledger.png`.
Re-run it with `npm run capture:reader-guide-ui`.

The remaining **3** files are deliberately still placeholders because their captions require
real radio or multi-device evidence that the deterministic capture pass must not fabricate:
`06-photo-drop-scan.png`, `07-chapter-opener.png`, and `09-chapter-opener.png`.

## Shots that need a real radio

Three captions ask for a host with no IP connectivity and a real RNode or BLE link. These are
device-gated in the same way the conformance suites are; see
[STATUS-HARDWARE.md](../../STATUS-HARDWARE.md).

- `07-chapter-opener.png` — the offline panel needs a host with no IP route
- `09-chapter-opener.png` — needs an RNode-only interface list
- `06-photo-drop-scan.png` — needs two devices, one of them a phone

Do not substitute a plausible simulated radio state for these captions. Leave the placeholder
in place until the required host and link are available, then record the hardware used in the
capture commit.
