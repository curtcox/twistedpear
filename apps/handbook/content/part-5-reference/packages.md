# Package format

Mini-apps ship as deterministic **`.tpkg`** archives:

- Signed manifest (name, version, entry, capabilities, publisher key, `minHostApi`)
- Entry bundle (`bundle.js`) and assets
- Ed25519 signature over the manifest hash

Packaging flow: [Packaging & preview](chapter:sdk-apps-package).
256t distribution: [docs/256t-distribution.md](../../../docs/256t-distribution.md).
