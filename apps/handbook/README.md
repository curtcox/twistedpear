# Handbook

Interactive diagnostic documentation shipped as a mini-app.
Plan: [docs/handbook.md](../../docs/handbook.md).

## Develop

```bash
npm run build:handbook   # content → catalog + bundle.js
npm run test:handbook    # pack → launch on Node sandbox → chapters + applet
```

Author chapters under `content/` (markdown subset) and applets under
`content/applets/<id>/{applet.json,main.js}`. Register chapters in
`content/toc.json`. The build embeds seeds into `bundle.js` (checked in).
