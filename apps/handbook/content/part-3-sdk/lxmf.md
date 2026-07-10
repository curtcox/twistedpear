# LXMF messaging

LXMF is store-and-forward messaging on top of Reticulum. Mini-apps use it for
app-to-app mailboxes without holding private keys — the host signs and decrypts on
behalf of the app destination.

## When to use LXMF

Use LXMF when you need asynchronous messages between app destinations: chat,
notifications, or command/response patterns that tolerate delay. For bulk binary
payloads, use [Resource fetch](chapter:sdk-resource-fetch) instead.

## Capabilities

- `lxmf:send` — enqueue an outbound message from this app’s destination.
- `lxmf:receive` — read deliveries addressed to this app.

Withholding either capability turns the probe below into a `not-granted` card.

## API

```javascript
import { lxmf } from "@twistedpear/miniapp-sdk";

await lxmf.send({ to: peerAppId, subject: "hello", body: "hi" });
const inbox = await lxmf.receive();
```

Messages are namespaced to the app id. The host never exposes the device private key.

## Common outcomes

- `pass` — round-trip to self succeeded on this host.
- `unavailable` — LXMF path not configured (leaf without gateway, etc.).
- `not-granted` — send or receive capability withheld at install.

## Live probe

{{applet:lxmf-roundtrip}}

See also [Identity & signing](chapter:sdk-identity) and [Announce & subscribe](chapter:sdk-announce).
