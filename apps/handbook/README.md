# Handbook

Interactive diagnostic documentation shipped as a mini-app.
Plan: [docs/handbook.md](../../docs/handbook.md).

## Develop

```bash
npm run build:handbook        # content → catalog + bundle.js
npm run test:handbook         # pack → launch on Node sandbox → chapters + applets
npm run test:handbook-report  # run-all → share.put → seeded report diff
npm run test:handbook-mobile  # iOS + Android worklet path (D3)
npm run test:web-handbook     # Playwright: same suite on browser web host
```

Author chapters under `content/` (markdown subset) and applets under
`content/applets/<id>/{applet.json,main.js}`. Register chapters in
`content/toc.json`. The build embeds seeds into `bundle.js` (checked in).
