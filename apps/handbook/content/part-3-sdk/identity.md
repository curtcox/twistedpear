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

Use **Open in DevStudio** on any applet to copy the sample into a DevStudio
project via `share:cas`. Concept overview: [Concepts in practice](chapter:concepts-in-practice).
