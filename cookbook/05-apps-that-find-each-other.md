# 5. Apps that find each other

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

An **announce** is intended to be a small payload published into your app's namespace and
heard by hosts in reach that are running the same app. There is no server, subscription
list, history, or retry.

### Current host status

> **Transport support is host-specific.** The desktop host now maps these calls onto signed
> Reticulum destinations and exact aspect handlers. Conformance also launches the unchanged
> Neighborhood Board bundle in two distinct runtimes with distinct announce services joined
> by a transport, so the receive path is no longer proven by injecting into the receiver's
> own buffer. Native-mobile and static-web announce rollout is still tracked separately, and
> a simulated two-host transport is not radio or hardware evidence. Check host diagnostics
> and interface reachability before treating an announce as cross-device delivery.

That last clause is the whole chapter. An announce heard by nobody is simply gone. There is
no inbox it lands in, no queue it waits in, and no way to ask for it later. Two hosts
running the same app in the same room, one of which was closed when the other posted, will
never agree about what was said — and no amount of application code can fix that, because
the bytes were never stored anywhere.

**So there is no source of truth.** Each host's store is a record of what _that host heard_.
Design for that and announce-based apps are pleasant. Design against it and you will spend
your time building a sync protocol that the platform cannot support.

![How an announce reaches only the hosts listening right now, and why two stores diverge](/cookbook/images/concept-announce.svg)

**Diagram 5.0 — Announce fan-out.** An announce reaches only the hosts in radio range that
are running the same app and listening at that instant. A host that was closed never hears it
and never will. Each host's store is a record of what _that_ host heard, so no two are
guaranteed to agree.

![The three discovery apps and a host's announce browser](/cookbook/images/05-chapter-opener.png)

**Screenshot 5.1 — Chapter opener.** Three host captures in a row: Neighborhood board with
five posts from three different addresses, Swap shelf listing six offered items, and Link
weather showing a filled-in device readout. Beneath them, the host's own announce browser
panel showing raw announce traffic, with several rows attributed to the board and swap-shelf
app namespaces — establishing that these payloads are visible to the host, not just to the
app.

## How discovery works

There are three different layers that are easy to collapse into the word "discovery":

1. **An interface finds a neighbouring Reticulum node.** AutoInterface multicast, TCP,
   BLE, or an RNode gives the host a path to another node. This is what Link weather's
   coarse `presence.snapshot()` can help diagnose; it does not discover mini-apps.
2. **Reticulum announces a destination.** The sender creates an incoming destination from
   an identity plus an application name/aspects, then broadcasts a signed announce with
   optional `app_data`. Receivers register an announce handler with an exact aspect filter.
   Reticulum's [conceptual explanation](https://reticulum.network/manual/understanding.html#public-key-announcements),
   [Announce example](https://reticulum.network/manual/examples.html#announce), and
   [`Destination.announce()` API](https://reticulum.network/manual/reference.html#RNS.Destination.announce)
   define this underlying mechanism.
3. **The mini-app broker maps SDK calls onto that destination and handler.** The grant-gated
   API uses a Reticulum-backed adapter on desktop and a process-local default when a host has
   not supplied transport effects. The fallback implementation is
   [`packages/miniapp-runtime/src/services/announce.ts`](../packages/miniapp-runtime/src/services/announce.ts).

This chapter teaches the third layer's intended app contract. Until the adapter lands, use
it to develop and test payload handling locally; do not use it as evidence that two devices
can find each other.

The implementation path is specified in the
[local peer discovery and connection plan](../docs/local-peer-discovery-plan.md). It puts
automatic Reticulum discovery, QR/camera, manual exchange, audio, native Bluetooth, ntfy
rendezvous, and any future browser Local Peer-to-Peer API behind one host-owned pairing
service. Mini-apps request a peer; the platform owns permissions, offer/answer exchange,
authentication, mechanism fallback, and connection setup.

Two SDK calls do all of it, and no others are involved:

- **`announce.publish(appData, namespace)`** writes one small beacon into `namespace`. The
  current local backend resolves after buffering it. A transport-backed backend should
  resolve after queueing it for transmission; neither result can tell you who heard it.
- **`announce.subscribe(namespace)`** resolves **once** with an array of the announces the host
  has buffered for that namespace _at the instant you call it_. Each entry is
  `{ destination, appData, receivedAt }`: `destination` is the peer that announced, `appData`
  is the raw bytes they sent (you decode and parse them yourself — they are as trustworthy as
  a query string), and `receivedAt` is when this host heard it.

Four things trip people up:

1. **It is a snapshot, not a stream.** `subscribe` does not stay open and push later announces
   at you; the promise resolves with whatever is already buffered and never resolves again. So
   an app that subscribes once at launch shows what the host had _already_ heard. To keep
   finding peers who announce afterwards, call `subscribe` again on a timer — poll, exactly the
   way [Link weather](#link-weather) polls `presence.snapshot()`, and for the same reason:
   there is no event to await.
2. **Both sides must use the exact same namespace.** These samples pass the same explicit
   string to both calls. If both calls omit it, the runtime uses the calling app's default
   `miniapp-announce:<appId>` namespace. Omitting it on only one call cannot match an explicit
   short name such as `neighborhood-board`. An announce in the `neighborhood-board` namespace
   is invisible to a subscriber reading `swap-shelf`; there is no global feed.
3. **"Apps" here means instances of the same mini-app.** Neighborhood board does not search
   for Swap shelf. Separate mini-apps have separate identities and intended app namespaces.
   This API is not general app-to-app IPC. For a brokered channel between two running
   mini-apps, use `apps.channel` (`apps:channel`) — both sides grant the named destination.
4. **A visible peer is necessary but not sufficient.** Check Link weather first. A peer count
   of zero means the transport cannot work; a non-zero count only proves interface-level
   reachability, not that the mini-app announce adapter exists or that the remote device is
   running the same app with matching grants and namespace.

The underlying docs, in order of authority:

- [`docs/miniapp-sdk.md`](../docs/miniapp-sdk.md) — the `announce` namespace and the
  `announce:publish` / `announce:subscribe` capabilities. When it and this cookbook disagree,
  it wins.
- [`docs/miniapp-runtime.md`](../docs/miniapp-runtime.md) — the broker that gates every
  announce call behind a grant, and the sandbox it crosses.
- [`docs/desktop-host.md`](../docs/desktop-host.md) and
  [`docs/web-host.md`](../docs/web-host.md) — host architecture and the transport/runtime
  boundary where a Reticulum-backed adapter must be wired.
- [Authoring guide §7 — Announces](../authors/07-identity-messaging-and-peers.md#announces) and
  the [SDK reference — announce](../authors/appendix-sdk-reference.md#announce) — the same
  mechanism taught one call at a time.
- [Appendix: feature status](appendix-feature-status.md) — the snapshot/poll limit, recorded
  next to the matching `presence.snapshot()` one.

| Recipe                                    | Capabilities                                                 | Directory                                                    |
| ----------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| [Neighborhood board](#neighborhood-board) | `announce:publish`, `announce:subscribe`, `storage:hyperbee` | [apps/neighborhood-board](apps/neighborhood-board/README.md) |
| [Swap shelf](#swap-shelf)                 | `announce:publish`, `announce:subscribe`, `storage:kv`       | [apps/swap-shelf](apps/swap-shelf/README.md)                 |
| [Link weather](#link-weather)             | `presence`, `peer:connect`                                   | [apps/link-weather](apps/link-weather/README.md)             |

---

## Neighborhood board

> **Capabilities:** `announce:publish`, `announce:subscribe`, `storage:hyperbee`

A local noticeboard. Every post is an announce; every host keeps whatever it heard. The
canonical shape for announce apps, and the one to copy.

![Neighborhood board with posts from three addresses](/cookbook/images/05-neighborhood-board.png)

**Screenshot 5.2 — Neighborhood board.** The mini-app surface: a post input capped at 180
characters with a **Post** button, a divider, and a scrolling list of six posts. Each post is
two lines — the text, then a small grey line reading like "9c31f7a2e4b0 · 2026-07-21 09:14".
Posts from three visibly different addresses are interleaved. The status line reads
"Published. Only hosts within radio reach right now will have heard it."

### The interesting part

`announce.subscribe` hands you a snapshot of what this host has already heard in the namespace
— an array, not a live stream (see [How discovery works](#how-discovery-works)) — and every
heard event is written straight to the local store:

```javascript
announce.subscribe(ANNOUNCE_NAMESPACE).then(async (events) => {
  for (const event of events) {
    let data;
    try {
      data = JSON.parse(decoder.decode(event.appData)); // raw bytes from a stranger
    } catch (error) {
      continue; // not our JSON — drop it
    }
    if (
      data === null ||
      typeof data !== "object" ||
      typeof data.text !== "string"
    )
      continue;
    await store(
      event.destination,
      data.text,
      data.at ?? new Date().toISOString(),
    );
    await render();
  }
});
```

`event.appData` is bytes, not an object — you decode and parse it yourself, and you assume it
is hostile while you do. An announce arrives from an arbitrary host running arbitrary code
claiming to be your app, and it is exactly as trustworthy as a query string. So the `JSON.parse`
is wrapped, because a peer can send bytes that are not JSON at all; `data.text` is type-checked;
and `data.at` has a fallback — because a peer that sends `at: null`, or `at` as an object, must
not be able to break your key generation. `event.destination`, not the payload, is the byline:
the payload is a claim, the destination is who the host actually heard it from.

The subscription is a one-shot read, so this board shows the posts the host had already heard
when it opened. To keep hearing posts announced later, call `announce.subscribe` again on a
timer — there is no event to await.

In conformance, "the host had already heard" includes events carried between distinct host
services. On desktop it can mean a Reticulum announce; on hosts still using the fallback it
means only the host-local buffer. See [Current host status](#current-host-status) above.

Your own posts go into the same store by the same path:

```javascript
await announce.publish(payload);
await store("me", payload.text, at);
```

This looks redundant and is not. You will not hear your own announce, so if you do not store
it locally it does not appear on your own board. More importantly, it keeps the local store
as the single thing the UI reads from — one code path, not two.

The status message is the honest one. "Published" would be a lie; only hosts in reach right
now, running this app, listening at this instant, heard anything.

Full source: [apps/neighborhood-board/bundle.js](apps/neighborhood-board/bundle.js).

### Make it yours

- **Keep discovering.** Subscribing once shows only what the host had already heard. Call
  `announce.subscribe` again on a timer to pick up posts announced after you opened — see
  [How discovery works](#how-discovery-works). Re-hearing an announce here is harmless: its key
  is derived from the post's timestamp, so a repeat overwrites rather than duplicates.
- **De-duplicate.** Two hosts can relay the same post. Key on a content hash instead of a
  timestamp and the duplicate collapses into one entry for free.
- **Add a "heard from" count.** Store how many distinct peers relayed each post — a cheap and
  surprisingly good proxy for whether the neighbourhood is actually connected.
- **Relay what you hear.** Republish other people's posts with a decremented hop count. You
  have built flooding; be careful, because on a shared radio channel flooding is
  indistinguishable from jamming.
- **Moderate locally.** A per-address mute list. It is the only moderation that can exist
  here — there is no registry, no authority, and nobody to appeal to.

---

## Swap shelf

> **Capabilities:** `announce:publish`, `announce:subscribe`, `storage:kv`

Small ads for a neighbourhood. Included for one reason: it is the recipe where the payload
budget is a visible feature rather than a hidden constraint.

![Swap shelf showing the payload byte budget](/cookbook/images/05-swap-shelf.png)

**Screenshot 5.3 — Swap shelf.** The mini-app surface: an input reading "What are you
offering?" containing "Ladder, 6ft, free to good home", a small grey line directly beneath it
reading "84 bytes left in the payload budget", an **Offer it** button, a divider, and a
scrolling list of eight listings, each one line, formatted "item — address prefix".

### The interesting part

```javascript
const MAX_PAYLOAD_BYTES = 120;

function payloadFor(item) {
  const payload = { i: item };
  const bytes = encoder.encode(JSON.stringify(payload)).length;
  return bytes > MAX_PAYLOAD_BYTES ? null : payload;
}
```

The key is `i`, not `item`. On an IP link that is absurd micro-optimisation. On a LoRa
interface running at a few hundred bits per second, the four bytes you saved on a key name
are four bytes of airtime on a channel every one of your neighbours is sharing, on every
single listing, forever.

The counter is shown to the user _live_, which turns an invisible protocol limit into an
ordinary editing constraint — the same way a character counter does. Users are good at
writing to a budget when they can see it, and terrible at it when they cannot.

The second lesson is expiry:

```javascript
// Expiry is a local decision. Nothing revokes an announce, so every host decides
// for itself when a listing has gone stale.
const cutoff = Date.now() - STALE_MS;
listings = listings.filter((row) => row.at >= cutoff).slice(-200);
```

There is no delete. You cannot un-announce, you cannot recall a listing, and you cannot tell
anyone that the ladder is gone except by sending another announce that they may not hear.
Every host ages things out on its own clock, which means two neighbours will disagree about
what is still available — and the app's honest response is to expire aggressively rather
than to imply currency it cannot deliver.

Full source: [apps/swap-shelf/bundle.js](apps/swap-shelf/bundle.js).

### Make it yours

- **Add a "taken" announce.** A second message type that tombstones a listing locally on
  anyone who hears it. Accept that some hosts will never hear it.
- **Add categories.** One byte, as an index into a fixed array. Not a string.
- **Contact the seller.** Add `lxmf:send` and the listing becomes actionable — see
  [Chapter 4](04-apps-that-talk-to-one-peer.md).
- **Shrink further.** Drop JSON entirely for a positional format, as
  [Nine line](09-apps-for-a-bad-link.md#nine-line) does. You will save another 15–20 %.

---

## Link weather

> **Capabilities:** `presence`, `peer:connect`

A dashboard of your interfaces, peers, rendezvous mechanisms, authenticated connections,
and quota headroom. The only app in the cookbook that tells you the truth about the device
it is running on, and the one to open first when something is not working.

![Link weather showing a device readout](/cookbook/images/05-link-weather.png)

**Screenshot 5.4 — Link weather.** The deployed sample running against its labelled
deterministic adapter. The mini-app surface shows host and interface facts, followed by the
peer mechanisms this host reports. Real devices replace the fixture values and availability
reasons with their own camera, audio, Bluetooth, network, and policy state.

### The interesting part

Everything on the screen is read, not assumed.

```javascript
snapshot = await presence.snapshot();
info = await host.info();
diagnostics = await peers.diagnostics();
```

An app that assumes it has a TCP interface is wrong on a phone in a field. An app that
assumes an RNode is present is wrong on a laptop. `host.info()` is how you find out which
world you are in, and the advisory line shows the payoff — the same app gives opposite advice
on the two devices:

```javascript
interfaces.includes("rnode") || interfaces.includes("ble")
  ? "Slow link present. Budget every byte you send."
  : "IP-backed link. Bulk transfer is plausible here and nowhere else.";
```

Any non-trivial app should branch on this. Fetching a two-megabyte file is reasonable over
IP and antisocial over LoRa, and the only way to know which you are on is to ask.

The pairing section follows the same rule. It does not infer that a web host has Bluetooth
or that a phone has usable Internet. `peers.diagnostics()` reports every adapter registered
by the host as `available`, `permission-required`, `unsupported`, `offline`, or
`policy-disabled`. Link Weather keeps all seven standard mechanism names visible so a host
configuration gap is distinguishable from a permission prompt.

Invite and join are the two directions of the same host-owned operation:

```javascript
const handle = await peers.request({
  purpose: "Inspect and establish a Link Weather peer connection",
  mechanisms: ["qr"],
});
const summary = await peers.info(handle);
```

Changing `request` to `listen` joins an incoming invitation. Changing the explicit array to
`"any"` lets the host rank the usable choices. The same calls cover Reticulum, QR, manual,
audio, Bluetooth, ntfy, and Local Peer-to-Peer; the mini-app never receives camera frames,
microphone samples, BLE packets, invitation codes, signaling credentials, or raw sockets.
Trusted host chrome performs permissions, offer/answer exchange, authentication, matching-
word confirmation, and route setup before returning the opaque handle. `peers.close(handle)`
disconnects it.

The failure path matters too:

```javascript
} catch (error) {
  // One missing diagnostic surface should not hide the readings that did succeed.
  status = "Partial read — unavailable: …";
}
```

`minHostApi` in your manifest stops an app from installing on a host too old for it, but
a call that arrived in a point release will still throw on hosts between those versions.
Degrade rather than die.

> **`presence` remains coarse.** For a capability-gated, app-scoped per-peer roster, use
> `links.peers()` and `links.watch()`. Exact remote bandwidth is never exposed: Line Check
> combines host-observed quality with the peer's coarse, TTL-bounded readiness bucket.

## Line check

### Two-sided realtime truth

![Line Check reachability matrix](/cookbook/images/05-line-check.png)

Line Check labels low-confidence declared paths as “probably,” spends airtime only when the
user chooses **Measure now**, and reads a host-owned share policy that the app cannot widen.
On a LoRa path, “events only” is a successful and honest result.

Full source: [apps/line-check/bundle.js](apps/line-check/bundle.js).

> **Peer mechanisms are rendezvous, not necessarily data planes.** A QR-created connection
> may use WebRTC; an ntfy-created connection may use a Reticulum gateway. The connected-peer
> row deliberately shows both `rendezvous` and `dataPlane` rather than calling them the same
> thing.

Full source: [apps/link-weather/bundle.js](apps/link-weather/bundle.js).

### Make it yours

- **Log the readings.** Add `storage:hyperbee`, sample every minute while open, and you have a
  connectivity history for the times you were looking.
- **Show quota as bars.** `progress` widgets against the numbers from `host.info().quota`.
- **Turn it into a preflight check.** Have your _other_ app call `host.info()` on launch and
  refuse to attempt a large transfer over a radio interface. That is the actual lesson of this
  recipe.
- **Filter by your real requirement.** Pass only mechanisms acceptable for the task, or use
  `"any"` when host policy should choose. Do not start several radios concurrently in app
  code.

---

## What this chapter was actually about

Announce is a broadcast into a room, not a message to a mailbox. Everything follows from
that:

- **Validate every field of every payload.** It came from a stranger's code.
- **Store what you heard, and never call it the truth.** Other hosts heard something else.
- **Expire locally, because nothing can be recalled.**
- **Count the bytes, because everyone in range pays for them.**

---

Next: [Apps that move files](06-apps-that-move-files.md) — content addressing, budgeted
fetches, and caching as a form of good manners.
