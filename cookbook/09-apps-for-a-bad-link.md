# 9. Apps for a bad link

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Every other chapter in this cookbook works on a laptop with wifi. This one is about the
devices that make TwistedPear worth having: a phone paired to a LoRa radio, a node in a
valley, two people in a building with no infrastructure.

The numbers are not close to each other.

| Interface | Order of magnitude | 1 KiB takes about | 180 KiB package takes about |
|---|---|---|---|
| TCP over wifi | tens of Mbit/s | instant | under a second |
| Bluetooth LE | tens of kbit/s | under a second | a minute or two |
| LoRa via RNode | hundreds of bit/s | tens of seconds | **hours** |

That last cell is the entire design constraint. A one-kilobyte message is not "small" on
LoRa; it is roughly half a minute of a channel that everyone within radio range is sharing
and nobody else can use while you have it.

> **⚠️ Works, with limits — published radio figures are design targets.** Throughput,
> spawn/kill timings, memory, and battery on real handsets and radios are hardware debt. The
> orders of magnitude above are right; treat specific numbers as approximate until measured.
> See [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) (H3, H11, H13).

## Six rules

1. **Design the wire format first.** Not the UI, not the data model. The bytes.
2. **Drop keys.** Positional formats beat JSON by 30–50 % on small records.
3. **Show the budget to the user.** They will write to it if they can see it.
4. **Queue everything.** A send that fails is normal, not exceptional.
5. **Pace yourself.** Duty cycles are shared, and your app is not the only one on the channel.
6. **Branch on the interface.** `host.info()` tells you which world you are in; behave
   differently in each.

![The same package taking seconds on wifi and hours on LoRa, and the two habits that follow](/cookbook/images/concept-byte-budget.svg)

**Diagram 9.0 — Designing for a slow link.** The same package that arrives in under a second
over wifi takes hours over LoRa, where every byte is airtime on a channel everyone in range
shares. Two habits follow: show the user a live byte budget, and drop JSON keys for a
positional wire format that runs 30–50% smaller.

![The three constrained apps on a radio-equipped host](/cookbook/images/09-chapter-opener.png)

**Screenshot 9.1 — Chapter opener.** Three captures from a host whose interface list shows
`rnode` only: Nine line with a red-tinted byte counter reading "231 / 220 bytes"; Beacon lite
showing "38 bytes per beacon · 2 peers in range"; Net ledger showing a check-in roster of nine
callsigns and an **Outbox (3)** button. The absence of any IP interface should be visible in
each shot.

| Recipe | Capabilities | Directory |
|---|---|---|
| [Nine line](#nine-line) | `lxmf:send`, `storage:kv` | [apps/nine-line](apps/nine-line/README.md) |
| [Beacon lite](#beacon-lite) | `announce:publish`, `presence` | [apps/beacon-lite](apps/beacon-lite/README.md) |
| [Net ledger](#net-ledger) | `lxmf:send`, `lxmf:receive`, `storage:kv` | [apps/net-ledger](apps/net-ledger/README.md) |

---

## Nine line

> **Capabilities:** `lxmf:send`, `storage:kv`

A fixed nine-field incident report that fits in a single small payload, and queues itself
when there is no link. The recipe designed backwards from the radio.

![Nine line with the byte counter over budget](/cookbook/images/09-nine-line.png)

**Screenshot 9.2 — Nine line, over budget.** The mini-app surface: a recipient input, then a
scrolling column of nine numbered inputs ("1 Location", "2 Callsign / frequency", "3
Precedence", …) with the first five filled in. Below them, a bold counter reading "231 / 220
bytes" rendered in red. A row of **Send** and **Flush queue (2)** buttons. The counter being
over its limit, in red, while the user is still typing, is the subject of the shot.

### The interesting part

The wire format has no keys at all:

```javascript
function wire() {
  return values.map((value) => value.replace(/\|/g, "/").trim()).join("|");
}
```

Nine positional fields joined by a pipe. There is no JSON, no field names, no whitespace, and
no room for ambiguity — both ends agree on what position four means, forever, because the
format is fixed by the form.

Compare honestly. As JSON with descriptive keys, a filled report runs 380–450 bytes. Positional,
the same content is 190–230. On LoRa that difference is roughly a *minute* of airtime per
report, on a channel other people need.

The escape is the detail people forget: `replace(/\|/g, "/")` before joining, because a
delimiter that can appear in the data is not a delimiter. A field containing a pipe would
silently shift every subsequent field by one position, and the receiver would have no way to
detect it.

The ceiling is enforced, not suggested:

```javascript
if (byteLength() > MAX_BYTES) {
  status = `${byteLength()} bytes — over the ${MAX_BYTES}-byte ceiling. Shorten a field.`;
  return;
}
```

and shown live while typing, in red, which is the whole reason the app is usable — the
constraint is visible at the moment the user can do something about it.

The queue is the other half:

```javascript
} catch (error) {
  // No link right now. Queue it — the platform will not retry for you, and the app
  // is not running when it is closed, so "later" means "next time someone opens this".
  queue = [...queue, { to: recipient.trim(), body, at: Date.now() }];
  await saveQueue();
  status = `No link. Queued — ${queue.length} report(s) waiting. Reopen this app when you have a link.`;
}
```

Read the status message carefully. It tells the user something true and slightly
disappointing: the queue will not drain by itself. There is no background execution, so the
app must be open for anything to be sent. Saying so is much better than implying a background
sync that will never happen.

Full source: [apps/nine-line/bundle.js](apps/nine-line/bundle.js).

### Make it yours

- **Compress the enumerations.** Precedence and status are fixed vocabularies; send an index,
  not a word. Another 20–30 bytes.
- **Add a report id and a resend.** Without one you cannot tell a duplicate from an update.
- **Auto-flush on open.** Try the queue when the app launches, before the user asks. Report
  what happened.
- **Confirm receipt.** Add `lxmf:receive` and have the coordinator acknowledge — remembering
  that an ack costs airtime too, so it should be the report id and nothing else.

---

## Beacon lite

> **Capabilities:** `announce:publish`, `presence`

Publishes a periodic minimal status beacon and does nothing else. The recipe about pacing,
which on a shared channel matters as much as size.

![Beacon lite showing its payload size](/cookbook/images/09-beacon-lite.png)

**Screenshot 9.3 — Beacon lite.** The deployed web sample running against its labelled
deterministic adapter: a row of four state buttons with "● ok" selected, a short note input
containing "at camp", the live payload size and two fixture peers, the five-minute repeat
switch on, a completed **Beacon now** action, and the reminder that closing the app stops the
beacon. Radio peer counts are intentionally not claimed by this web capture.

### The interesting part

The payload is three single-character keys:

```javascript
function payload() {
  // s = state index, n = short note, t = minutes since the hour, for coarse freshness
  return { s: STATES.indexOf(state), n: note.slice(0, 12), t: new Date().getUTCMinutes() };
}
```

State is an **index**, not a word. `t` is minutes past the hour rather than a timestamp,
because coarse freshness is all a beacon needs and a full ISO string costs 24 bytes on its
own. The note is hard-truncated to twelve characters at the point of entry, not validated
later.

The pacing is enforced in two places:

```javascript
const MIN_INTERVAL_MS = 5 * 60 * 1000;

if (!manual && since < MIN_INTERVAL_MS) return;
if (manual && since < 30_000) {
  status = "Too soon. Give the channel a rest.";
  return;
}
```

The automatic path cannot beacon more than every five minutes, and the manual path refuses
more than every thirty seconds. Both limits are in the app because nothing else will impose
them: the host does not rate-limit announces on your behalf beyond the general broker ceiling,
and the broker ceiling of 60 messages per second is astronomically more than a LoRa channel
can absorb.

This is a straightforwardly social constraint. Radio spectrum is shared; an app that beacons
every ten seconds makes the channel unusable for everybody in range, including for the traffic
that matters. Rate-limit yourself.

And the footnote, again: closing the app stops the beacon. There is no background beaconing,
so "leave it running" means leaving the app in the foreground with the screen on — which is a
battery decision the user should get to make knowingly.

Full source: [apps/beacon-lite/bundle.js](apps/beacon-lite/bundle.js).

### Make it yours

- **Listen as well as beacon.** Add `announce:subscribe` and show who else is beaconing. Two of
  these facing each other is a presence map.
- **Back off when nobody is listening.** `presence.snapshot()` already gives you a peer count;
  beacon less when it is zero.
- **Add a duress state.** A fourth state costs zero extra bytes, since it is an index.
- **Vary the interval by interface.** Every 30 seconds over wifi, every 5 minutes over LoRa.
  `host.info()` tells you which — see
  [Link weather](05-apps-that-find-each-other.md#link-weather).

---

## Net ledger

> **Capabilities:** `lxmf:send`, `lxmf:receive`, `storage:kv`

Logs an amateur-radio net: check-ins in, roster out. Fully usable with no link at all, and
files its report whenever one appears.

![Net ledger with a check-in roster and a held outbox](/cookbook/images/09-net-ledger.png)

**Screenshot 9.4 — Net ledger.** The mini-app surface: a net control address input at the top,
a divider, callsign and traffic inputs with a **Check in** button, another divider, a scrolling
roster of nine timestamped check-ins reading like "14:03:22 KD9XYZ traffic for Reno", and a
bottom row with **File roster** and **Outbox (3)** buttons. The status line reads "No link.
Held in the outbox (3)."

### The interesting part

The app's primary function needs no network whatsoever. Check-ins are logged locally,
immediately, and the roster is complete and useful whether or not anything is ever sent:

```javascript
async function checkIn() {
  if (call.trim().length === 0) return;
  checkins = [...checkins, { call: call.trim().toUpperCase(), at: Date.now(), note: note.trim() }];
  await persist();
  status = `${checkins.length} check-ins logged locally`;
}
```

Networking is a separate, optional action. This is the correct decomposition for anything used
in the field: **the app works, and then it also transmits.** An app that requires a link before
it will let you record what is happening in front of you is an app that will fail exactly when
you need it.

The outbox is the same store-and-forward pattern as Nine line, and it is worth noticing it is
the same because the platform gives you nothing here — no retry, no queue, no delivery
receipt, no background drain. Every app that needs to survive a missing link writes this by
hand.

```javascript
async function drain() {
  const remaining = [];
  for (const item of outbox) {
    try {
      await lxmf.send({ to: item.to, subject: "net/roster", body: item.body });
    } catch (error) {
      remaining.push(item);
    }
  }
  outbox = remaining;
  await persist();
}
```

Failures go back on the queue and successes disappear. Note the outbox is persisted on every
change, not at exit — because there is no reliable exit. The host can stop this app between
any two lines.

The one real compromise in this recipe is the roster format: it is a comma-joined string,
which is fine for a dozen callsigns and gets expensive fast. On a link this slow, a net of
sixty stations should file in batches, and the app does not do that.

Full source: [apps/net-ledger/bundle.js](apps/net-ledger/bundle.js).

### Make it yours

- **File a larger roster through a host.** The tested
  [multipart propagation recipe](06-apps-that-move-files.md#host-recipe-leave-a-bounded-payload-for-an-offline-peer)
  numbers, resumes, and verifies the parts. Keep independently useful batches when partial
  delivery is more valuable than all-or-nothing reassembly.
- **Auto-drain on launch and on interface change.** Best-effort, reported honestly.
- **Receive check-ins over the air.** `lxmf:receive` is already granted — remote stations could
  check themselves in.
- **Export the log.** `share.put` at the end of the net, and hand out one identifier instead of
  sending the whole roster to each person.

---

## What this chapter was actually about

Bandwidth is the constraint that reaches furthest up into your design. It changes your wire
format, which changes your data model, which changes your UI, which changes what the app is
for.

If you take one thing from this cookbook, take this: **write the bytes on paper before you
write the app.** Nine fields joined by pipes was a decision made before a single line of Nine
line existed, and every other choice in that app follows from it.

---

Next: [Appendix: app index](appendix-app-index.md) — all twenty-five samples in one table.
