# 5. Apps that find each other

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

An **announce** is a small payload published into your app's namespace, heard by every host
in reach that is running the same app and listening at that moment. There is no server, no
subscription list, no history, and no retry.

That last clause is the whole chapter. An announce heard by nobody is simply gone. There is
no inbox it lands in, no queue it waits in, and no way to ask for it later. Two hosts
running the same app in the same room, one of which was closed when the other posted, will
never agree about what was said — and no amount of application code can fix that, because
the bytes were never stored anywhere.

**So there is no source of truth.** Each host's store is a record of what *that host heard*.
Design for that and announce-based apps are pleasant. Design against it and you will spend
your time building a sync protocol that the platform cannot support.

![The three discovery apps and a host's announce browser](/cookbook/images/05-chapter-opener.png)

**Screenshot 5.1 — Chapter opener.** Three host captures in a row: Neighborhood board with
five posts from three different addresses, Swap shelf listing six offered items, and Link
weather showing a filled-in device readout. Beneath them, the host's own announce browser
panel showing raw announce traffic, with several rows attributed to the board and swap-shelf
app namespaces — establishing that these payloads are visible to the host, not just to the
app.

| Recipe | Capabilities | Directory |
|---|---|---|
| [Neighborhood board](#neighborhood-board) | `announce:publish`, `announce:subscribe`, `storage:hyperbee` | [apps/neighborhood-board](apps/neighborhood-board/README.md) |
| [Swap shelf](#swap-shelf) | `announce:publish`, `announce:subscribe`, `storage:kv` | [apps/swap-shelf](apps/swap-shelf/README.md) |
| [Link weather](#link-weather) | `presence` | [apps/link-weather](apps/link-weather/README.md) |

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

The subscription is a stream you consume forever, and every heard event is written straight
to the local store:

```javascript
announce.subscribe().then(async (stream) => {
  for await (const event of stream) {
    const data = event.appData ?? {};
    if (typeof data.text !== "string") continue;     // untrusted: validate before storing
    await store(event.from ?? "unknown", data.text, data.at ?? new Date().toISOString());
    await render();
  }
});
```

Every field is checked. An announce payload arrives from an arbitrary host running arbitrary
code claiming to be your app, and it is exactly as trustworthy as a query string. `data.text`
is type-checked, and `data.at` has a fallback — because a peer that sends `at: null`, or `at`
as an object, must not be able to break your key generation.

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

The counter is shown to the user *live*, which turns an invisible protocol limit into an
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

> **Capabilities:** `presence`

A dashboard of your interfaces, peers, and quota headroom. The only app in the cookbook that
tells you the truth about the device it is running on, and the one to open first when
something is not working.

![Link weather showing a device readout](/cookbook/images/05-link-weather.png)

**Screenshot 5.4 — Link weather.** The mini-app surface as a label/value table: Platform
`android`, Host `1.0.0`, Host API `0.3.0`, Roles `node, seeder`, Interfaces `ble, rnode`,
Peers seen `3`, KV used `18432 / 1048576`, Granted `presence`. A divider, then a bold advisory
line reading "Slow link present. Budget every byte you send."

### The interesting part

Everything on the screen is read, not assumed.

```javascript
snapshot = await presence.snapshot();
info = await host.info();
```

An app that assumes it has a TCP interface is wrong on a phone in a field. An app that
assumes an RNode is present is wrong on a laptop. `host.info()` is how you find out which
world you are in, and the advisory line shows the payoff — the same app gives opposite advice
on the two devices:

```javascript
interfaces.includes("rnode") || interfaces.includes("ble")
  ? "Slow link present. Budget every byte you send."
  : "IP-backed link. Bulk transfer is plausible here and nowhere else."
```

Any non-trivial app should branch on this. Fetching a two-megabyte file is reasonable over
IP and antisocial over LoRa, and the only way to know which you are on is to ask.

The failure path matters too:

```javascript
} catch (error) {
  // host.info needs host API 0.3.0. An older host answers presence.snapshot only.
  status = "Partial read — this host may predate host API 0.3.0";
}
```

`minHostApi` in your manifest stops an app from installing on a host too old for it, but
a call that arrived in a point release will still throw on hosts between those versions.
Degrade rather than die.

> **⚠️ Works, with limits — what `presence` actually tells you.** The snapshot is coarse:
> peer and interface state, not signal strength, not per-link throughput, not battery. Nothing
> here supports a real link-quality graph, and the numbers do not update on their own — this
> app polls because there is no event to subscribe to.

Full source: [apps/link-weather/bundle.js](apps/link-weather/bundle.js).

### Make it yours

- **Log the readings.** Add `storage:hyperbee`, sample every minute while open, and you have a
  connectivity history for the times you were looking.
- **Show quota as bars.** `progress` widgets against the numbers from `host.info().quota`.
- **Turn it into a preflight check.** Have your *other* app call `host.info()` on launch and
  refuse to attempt a large transfer over a radio interface. That is the actual lesson of this
  recipe.

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
