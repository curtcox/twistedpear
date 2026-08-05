# Content-addressed share


<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

`share:cas` stores a bounded string and returns a 94-character 256t id.
Paste or scan that id on another device to `share.get` the same bytes —
diagnostics reports and DevStudio hand-offs use this path.

## Why CAS for reports

Diagnostic JSON can be large. `share.put` returns a stable id suitable for QR
codes on the Diagnostics screen. Compare report pastes that id to diff against
another host.

## API

```javascript
import { share } from "@twistedpear/miniapp-sdk";

const { t256, size } = await share.put("hello");
const again = await share.get(t256);
```

Payload size is capped by the host quota snapshot in `host.info()`.

## Outcomes

- `pass` — put/get round-trip matched.
- `not-granted` — `share:cas` withheld.

## Live probe

{{applet:share-cas}}

Used by [Running diagnostics](chapter:running-diagnostics) export and **Open in DevStudio**.
