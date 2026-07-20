# Package format


<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

Mini-apps ship as deterministic **`.tpkg`** archives:

- Signed manifest (name, version, entry, capabilities, publisher key, `minHostApi`)
- Entry bundle (`bundle.js`) and assets
- Ed25519 signature over the manifest hash

Packaging flow: [Packaging & preview](chapter:sdk-apps-package).
Distribution tutorial: [Publish, install & update](chapter:sdk-apps-update).
