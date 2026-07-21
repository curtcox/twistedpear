# 7. Identity, messaging, and peers

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

This is the chapter where your app stops being local. Four namespaces: `identity`, `lxmf`,
`announce`, and `presence`, plus `resource` for pulling package data.

The theme running through all of them: **you never touch a key, a socket, or an address book.**
The host derives, signs, routes, and delivers; you get an app-scoped view of the results.

## App-scoped identity

```javascript
import { identity } from "@twistedpear/miniapp-sdk";

const me = await identity.destinationHash();     // your app's address
const signature = await identity.sign(payload);  // brokered signing
```

`destinationHash()` returns an address derived from the **host identity plus your app id**.
This is not the user's identity. Two consequences:

- Your app's address is stable for that user on that host, and different from the address the
  same user has in a different app. Apps cannot correlate users by address.
- `identity.sign` never gives you a private key. The signing happens host-side; the key never
  crosses the sandbox boundary. You get a signature back and nothing else.

Requires `identity`.

## Messaging with LXMF

```javascript
import { lxmf } from "@twistedpear/miniapp-sdk";

await lxmf.send({ to: peerAppId, subject: "hello", body: `Hi from ${me}` });

const messages = await lxmf.receive();
for (const message of messages) {
  console.log(message.from, message.body);
}
```

`lxmf.send` sends **from your app's destination**, not from the user's personal address —
that distinction is exactly what the grant screen promises the user, so do not design around
it. `lxmf.receive` returns the inbox namespaced to your app's destination.

Requires `lxmf:send` and `lxmf:receive` respectively. They are separate capabilities on
purpose: a broadcast-only app should ask for one.

### Designing for a network that is not the internet

Delivery is not immediate and not guaranteed on any timescale you would recognise from HTTP.
A peer may be:

- directly reachable, and answer in milliseconds;
- reachable only via a propagation node, and answer in hours when they next sync;
- reachable only over LoRa at hundreds of bits per second;
- not reachable at all, indefinitely.

So:

- **Never block your UI on a send.** Render optimistically, reconcile when the state changes.
- **Keep messages small.** A subject and a body, not a payload.
- **Make every message independently meaningful.** Do not build a protocol requiring messages
  to arrive in order or in pairs.
- **Poll `receive()` at a human rate.** Once a second is generous; you have a 60-call/sec
  budget for *everything* ([Chapter 12](12-limits-and-budgets.md)).

> **⚠️ Works, with limits — multipart propagation.** Host integrations can use
> `sendMultipartPropagation` and `MultipartPropagationReceiver` for ordered, resumable
> store-and-forward payloads. The default budget is 64 KiB and the framing is intentionally
> expensive, so mini-app messages should still be small. This is transport plumbing, not an
> attachment API. See [multipart propagation](../docs/multipart-propagation.md) and
> [Chapter 12](12-limits-and-budgets.md).

> **⏳ Not yet available — group messaging, attachments, and history sync.** Not in v1 scope.
> If your app needs a group, you are building it yourself out of point-to-point messages and
> your own local store.

## Announces

An announce is how your app becomes findable. `announce.publish` makes your app's destination
visible in your app's namespace; `announce.subscribe` receives what other instances publish.

```javascript
import { announce } from "@twistedpear/miniapp-sdk";

await announce.publish(appData);              // make this instance findable

for await (const item of announce.subscribe()) {
  // another instance of this app, announced by a peer
}
```

Announces are namespaced to your app, so you hear from other instances of *your* app, not
from the whole network. `appData` is small — it is a beacon, not a payload; put a pointer in
it and fetch the substance separately.

Requires `announce:publish` / `announce:subscribe`.

![An app showing peers it has discovered through announces](/authors/images/07-announce-peers.png)

**Screenshot 7.1 — Peers discovered by announce.** The `board` example running on the desktop
host. A `list` of four rows, each showing a short peer address in monospace, a relative
timestamp ("heard 2 min ago"), and a one-line summary from the announce payload. Above the
list, a `text` reading "4 peers announcing · publishing as bd91…". Below it, a **Refresh**
button. One row is greyed with the note "not heard in 20 min".

**Publishing an announce is user-visible activity.** It puts your app's presence on the local
radio. A user who declined `announce:publish` declined exactly that, and their reasons are
good ones — see the privacy discussion in
[User Guide chapter 8](../guide/08-trust-privacy-safety.md).

## Presence and host info

```javascript
import { presence, host } from "@twistedpear/miniapp-sdk";

const snapshot = await presence.snapshot();  // coarse peer/interface state
const info = await host.info();
```

`presence.snapshot()` is deliberately **coarse**. You learn roughly whether you have peers
and what kinds of interfaces are up. You do not get a peer list you could use to profile the
user's surroundings.

`host.info()` (host API `0.3.0`, requires `presence`) is the one to reach for at startup:

| Field | Use it for |
|---|---|
| Platform id | Adapting layout for phone vs desktop vs browser |
| Host version, `HOST_API_VERSION` | Feature-detecting newer SDK surface |
| Enabled roles | Knowing whether this host can seed or relay |
| Available interface types | Warning before a large transfer on a radio-only link |
| Quota snapshot | Sizing what you store |
| `grantedCapabilities` | Branching cleanly instead of catching `CapabilityError` |

```javascript
const info = await host.info();
const radioOnly = !info.availableInterfaceTypes.includes("tcp");
if (radioOnly) {
  await warnBeforeLargeTransfer();
}
```

## Fetching resources

```javascript
import { resource } from "@twistedpear/miniapp-sdk";

const bytes = await resource.fetch({ resourceId, budgetBytes: 32 * 1024 });
```

This pulls package resources through the host's budget rules. `budgetBytes` is your declared
ceiling; the host applies its own on top. The `file-drop` example is built around this call.

The host's own transfer policy will refuse or warn on your behalf depending on the link:
automatic bulk fetch over an RNode-only link is blocked above 64 KiB and warned above 32 KiB;
Bluetooth warnings start at 256 KiB. Those are not suggestions you can opt out of.

Requires `resource:fetch`.

## Content-addressed sharing

```javascript
import { share } from "@twistedpear/miniapp-sdk";

const t256 = await share.put(content);   // returns a 94-character identifier
const content = await share.get(t256);   // fetch by identifier
```

Bounded content-addressed storage and retrieval, keyed by 256t identifier. Use it when you
want to hand someone a *thing* rather than a message — the identifier is a fingerprint of the
bytes, so it cannot be redirected.

The same caveat as app installs applies: a `share.get` resolves only if the receiving host has
already heard a locator announce for those bytes.

Requires `share:cas`.

## The privacy contract you are inheriting

Your app's payloads are encrypted. Your user's *presence* is not. Bluetooth MAC addresses,
Wi-Fi multicast traffic, and an always-on radio are locally observable regardless of what you
send. TwistedPear is not an anonymity system and your app should not imply that it is.

If your app publishes announces, transmits frequently, or keeps a radio busy, that is a
privacy-relevant thing to do on the user's behalf. Say so, and make it optional where you
reasonably can. See [LIMITATIONS.md §9](../LIMITATIONS.md) and
[User Guide chapter 8](../guide/08-trust-privacy-safety.md).
