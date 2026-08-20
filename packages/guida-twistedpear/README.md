# @twistedpear/guida-twistedpear

<!-- tp-doc
lifecycle: live
audited: 2026-08-20
register: none
-->

Vendored Guida package for TwistedPear mini-apps: generated widget/style builders,
`TwistedPear.Program`, SDK bindings, and the JS shim the build step concatenates.

Apps consume this through `elm.json` `source-directories`, not a package registry.
See [docs/guida-ui.md](../../docs/guida-ui.md).

```sh
npm run generate:guida-widget
npm run generate:guida-sdk
npm test -- packages/guida-twistedpear/test
```
