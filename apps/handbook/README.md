# Handbook

Interactive diagnostic documentation shipped as a mini-app.
Plan: [docs/handbook.md](../../docs/handbook.md).

## Develop

```bash
npm run build:handbook        # content → catalog + bundle.js + part packages
npm run audit:handbook        # dead links, word counts, expectations
npm run pack:handbook-parts   # pack each part as handbook-part-*.tpkg
npm run test:handbook         # pack → launch on Node sandbox → chapters + applets + DevStudio handoff
npm run test:handbook-report  # run-all → share.put → seeded report diff
npm run test:handbook-mobile  # iOS + Android worklet path (D3)
npm run test:web-handbook     # Playwright: same suite on browser web host
```

Author chapters under `content/` (markdown subset) and applets under
`content/applets/<id>/{applet.json,main.js}`. Register chapters in
`content/toc.json`. The build embeds seeds into `bundle.js` (checked in).

## Per-part packages (BLE / constrained install)

`build.mjs` emits five slice packages under `generated/part-packages/`:

| Part | App id | ~size (BLE est.) |
|---|---|---|
| I Concepts | `handbook-part-1-concepts` | ~62 KiB (~21 s) |
| II Hosts | `handbook-part-2-hosts` | ~76 KiB (~26 s) |
| III SDK | `handbook-part-3-sdk` | ~147 KiB (~49 s) |
| IV Diagnostics | `handbook-part-4-diagnostics` | ~61 KiB (~21 s) |
| V Reference | `handbook-part-5-reference` | ~114 KiB (~38 s) |

Run `npm run pack:handbook-parts` to produce signed `.tpkg` archives in
`generated/part-packages-packed/`. Publish and install like any mini-app; each
part carries only the chapters and applets for that section.
