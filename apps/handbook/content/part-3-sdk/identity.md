# Identity & signing

The `identity` capability grants an app-scoped destination and brokered signing.
Private keys never enter the sandbox.

## API

```javascript
import { identity } from "@twistedpear/miniapp-sdk";

const hash = await identity.destinationHash();
const signature = await identity.sign(payloadBytes);
```

## Live probe

The applet below calls `identity.destinationHash()` on this host and reports
pass / fail / not-granted.

{{applet:identity-hash}}

Copy the applet source into DevStudio (when available) to experiment further.
See also [What TwistedPear is](chapter:what-is-twistedpear).
