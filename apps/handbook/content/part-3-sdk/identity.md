# Identity & signing

The `identity` capability grants an app-scoped destination and brokered signing.
Private keys never enter the sandbox — the host derives an app destination from the
device identity plus app id and performs crypto on the broker.

## Why app-scoped destinations

Publisher trust and app addressing share one root: the Reticulum keypair. Mini-apps
never see private key material; they receive hashes and signatures only.

## API

```javascript
import { identity } from "@twistedpear/miniapp-sdk";

const hash = await identity.destinationHash();
const signature = await identity.sign(payloadBytes);
```

`destinationHash` is stable for a given install. `sign` accepts raw bytes and returns
a signature verifiable against the app destination.

## Outcomes

- `pass` — hash and signing path work on this host.
- `not-granted` — identity capability withheld at install.

## Live probe

The applet below calls `identity.destinationHash()` on this host and reports
pass / fail / not-granted.

{{applet:identity-hash}}

Use **Open in DevStudio** on any applet to copy the sample into a DevStudio
project via `share:cas`. Concept overview: [Concepts in practice](chapter:concepts-in-practice).
