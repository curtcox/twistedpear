# macOS Notarization Procedure

<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

Status: procedure only — requires Apple Developer account (H12 in
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md)). CI already produces an unsigned macOS dmg
via the `electron-pack-macos` nightly job (`CSC_IDENTITY_AUTO_DISCOVERY=false`).

## Prerequisites

- Active Apple Developer Program membership (same account as iOS entitlement filing).
- Developer ID Application certificate installed in macOS Keychain.
- App-specific password for `notarytool` (or API key with notarization role).
- `host-desktop` release artifact from CI or local `npm run dist --workspace=host-desktop`.

## One-time setup

```bash
# Store notary credentials (choose one method)
xcrun notarytool store-credentials "twistedpear-notary" \
  --apple-id "you@example.com" \
  --team-id "TEAMID" \
  --password "@keychain:AC_PASSWORD"

# Or use App Store Connect API key
xcrun notarytool store-credentials "twistedpear-notary" \
  --key "/path/to/AuthKey_XXXX.p8" \
  --key-id "KEYID" \
  --issuer "ISSUER-UUID"
```

Export signing identity for electron-builder:

```bash
export CSC_NAME="Developer ID Application: Your Name (TEAMID)"
export CSC_LINK="/path/to/certificate.p12"   # if not in keychain
export CSC_KEY_PASSWORD="..."               # if using p12
```

## Sign and notarize

```bash
npm ci && npm run build
cd apps/host-desktop

# Build signed + notarized dmg (electron-builder notarize hook)
npm run dist

# Or notarize an existing artifact manually:
xcrun notarytool submit release/TwistedPear-*.dmg \
  --keychain-profile "twistedpear-notary" \
  --wait

xcrun stapler staple release/TwistedPear-*.dmg
```

## Verify

```bash
spctl -a -vv -t install release/TwistedPear-*.dmg
codesign -dv --verbose=4 release/mac/TwistedPear.app
xcrun stapler validate release/TwistedPear-*.dmg
```

## CI integration (future)

When H12 account exists, add secrets to GitHub:

| Secret                                     | Purpose              |
| ------------------------------------------ | -------------------- |
| `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` | notarytool           |
| `CSC_LINK` / `CSC_KEY_PASSWORD`            | Developer ID signing |

Update `electron-pack-macos` to set `CSC_IDENTITY_AUTO_DISCOVERY=true` and
`APPLE_NOTARIZE` credentials. Until then, notarization is manual per this document.

## Known limitation

Record the success date and stapled artifact hash with the release evidence when
notarization is completed. Until then, unsigned CI artifacts may be rejected by
Gatekeeper on first launch.
