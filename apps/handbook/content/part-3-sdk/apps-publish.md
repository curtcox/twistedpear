# Publish & install

<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

`apps:publish` announces a packaged 256t id under the publisher identity.
`apps:install` asks the host to fetch, verify, and review capabilities before
anything runs. Both raise a confirmation dialog on every call.

## Discover → trust → install

Discovery is announce-driven: users find a 256t id, verify the publisher signature,
grant capabilities, then launch. There is no central store — trust is signature-based.

## API

```javascript
import { apps } from "@twistedpear/miniapp-sdk";

await apps.publish(t256);
const installed = await apps.install(t256);
```

Package first with `apps.packageProject` — see [Packaging & preview](chapter:sdk-apps-package).

## Outcomes

- `pass` — publish and install succeeded with host confirmations approved.
- `not-granted` — `apps:publish` or `apps:install` withheld.
- `unavailable` — distribution backend not configured on this host.

## Live probe

{{applet:apps-publish-install}}

OTA updates reuse the same APIs with a bumped semver — [Publish, install & update](chapter:sdk-apps-update).
