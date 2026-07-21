# 4. Apps that talk to one peer

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

LXMF gives a mini-app one thing: send a message to an address, and read what has arrived.
That is the entire surface. It is worth being precise about what is *not* in it, because
every mistake in this chapter comes from assuming one of these exists:

- **No sessions.** Nothing correlates a reply to a request. That is your job.
- **No delivery guarantee, and no failure notification.** A send that returns successfully
  means the host accepted it, not that anyone received it.
- **No ordering.** Two messages may arrive in either order, or one may never arrive.
- **No push.** Your app receives nothing while it is closed, because it is not running.
- **No groups.** "Message everyone" means N individual sends.

An app built on those five facts is robust. An app that quietly assumes any one of them is
false works perfectly on a desk with two hosts on the same LAN and falls apart in a field.

## Addresses, and whose they are

Every app gets its **own** destination, derived from the host identity and the app id.

```javascript
const me = await identity.destinationHash();
```

This is not the user's address, and messages you send do not come from the user. Two
consequences worth stating plainly: your app cannot impersonate the person running it, and
your app cannot receive their mail. Both are deliberate. See
[Chapter 7 of the authoring guide](../authors/07-identity-messaging-and-peers.md).

![The three messaging apps, showing their app-scoped addresses](/cookbook/images/04-chapter-opener.png)

**Screenshot 4.1 — Chapter opener.** Three host captures side by side: Signal check showing
two completed round trips ("a7f2c1e9 — 412 ms"), Roll call showing a five-address roster with
three ticks and two ellipses, and Dead drop showing one received signed note. Each capture
has a small grey line near the top reading `This app: …` followed by an address, and the three addresses are
visibly different from each other.

| Recipe | Capabilities | Directory |
|---|---|---|
| [Signal check](#signal-check) | `identity`, `lxmf:send`, `lxmf:receive` | [apps/signal-check](apps/signal-check/README.md) |
| [Roll call](#roll-call) | + `storage:kv` | [apps/roll-call](apps/roll-call/README.md) |
| [Dead drop](#dead-drop) | `identity`, `lxmf:send`, `lxmf:receive` | [apps/dead-drop](apps/dead-drop/README.md) |

---

## Signal check

> **Capabilities:** `identity`, `lxmf:send`, `lxmf:receive`

Ping a peer, get a pong, see the round-trip time. The smallest app that has to solve the
correlation problem, which makes it the right place to learn it.

![Signal check with three round trips](/cookbook/images/04-signal-check.png)

**Screenshot 4.2 — Signal check.** The mini-app surface: heading, a small grey line "This
app: 4f2a…", a peer address input, a row of two buttons (**Ping**, **Check replies**), a
divider, and a list of four rows — three reading like "a7f2c1e9 — 412 ms" and one reading
"b0c41d33 … waiting". A status line reads "Checked inbox · 1 still outstanding". A footnote
reads "Round trip includes however long the app sat closed."

### The interesting part

There is no request id in the protocol, so the app puts one in the body and both sides agree
to echo it.

```javascript
async function ping() {
  const id = nonce();
  outstanding.set(id, Date.now());
  results = [{ nonce: id, ms: null }, ...results].slice(0, 10);
  await lxmf.send({ to: peer.trim(), subject: "signal-check/ping", body: id });
}
```

and on receipt:

```javascript
for (const message of messages) {
  if (message.subject === "signal-check/ping") {
    // Someone is pinging us. Answer with the same nonce so they can match it.
    await lxmf.send({ to: message.from, subject: "signal-check/pong", body: message.body });
    continue;
  }
  if (message.subject !== "signal-check/pong") continue;
  const sentAt = outstanding.get(message.body);
  if (sentAt === undefined) continue;              // unknown nonce: not ours, ignore
  outstanding.delete(message.body);
  results = results.map((row) =>
    row.nonce === message.body ? { ...row, ms: Date.now() - sentAt } : row
  );
}
```

Three habits here are worth stealing wholesale:

- **Namespace your subjects.** `signal-check/ping`, not `ping`. Your app's inbox is scoped to
  its own destination, but you will still end up with more than one message type, and a
  version prefix costs nothing today and saves a migration later.
- **Ignore what you do not recognise.** Unknown subject, unknown nonce — `continue`. Anything
  can arrive at your address, including messages from a future version of your own app.
- **Never assume a reply comes back.** `results` holds rows with `ms: null` indefinitely, and
  the UI shows them as "… waiting" rather than pretending they failed or pretending they
  succeeded. Some of them will stay that way forever, and that is a normal outcome.

The measurement is honest about what it is measuring, too. The elapsed time includes however
long the *other* app sat closed, because nothing was delivered while it was. This is not a
network latency measurement, and the footnote on screen says so.

Full source: [apps/signal-check/bundle.js](apps/signal-check/bundle.js).

### Make it yours

- **Time out.** After thirty seconds, move a row from "waiting" to "no reply". Note that this
  is still not "failed" — it is "we stopped waiting".
- **Show a rolling median.** Three samples on a radio link tell you almost nothing.
- **Ping several peers.** Which is [Roll call](#roll-call), below.

---

## Roll call

> **Capabilities:** `identity`, `lxmf:send`, `lxmf:receive`, `storage:kv`

Asks a saved list of addresses to check in, and shows who has answered. This is what "group
messaging" looks like when there is no group messaging.

![Roll call with a partially answered roster](/cookbook/images/04-roll-call.png)

**Screenshot 4.3 — Roll call.** The mini-app surface: an address input with an **Add**
button beside it, a row of two buttons (**Call the roll**, **Collect**), a divider, and a
roster of six rows. Three begin with a check mark, three with an ellipsis; each shows a
truncated address such as "✓ 9c31f7a2e4b0d5…". The status line reads "3 of 6 have answered".

### The interesting part

Fan-out is a loop, and the loop is sequential on purpose.

```javascript
for (const address of roster) {
  // Sequential on purpose. Firing all of these at once is the fastest way to meet
  // the 60-messages-per-second broker limit on a roster of any size.
  await lxmf.send({ to: address, subject: "roll-call/ask", body: "check in" });
}
```

`Promise.all` over a roster of eighty addresses is eighty broker messages in one tick,
against a ceiling of sixty per second. You will be throttled, and the throttle applies to
your whole app — including the `ui.render` that would have told the user what was happening.

The cost is also worth thinking about before you build a roster feature at all. Over an IP
link, eighty sends are free. Over LoRa, eighty sends of a hundred bytes each is several
minutes of continuous airtime on a channel you are sharing with everyone in radio range. See
[Chapter 9](09-apps-for-a-bad-link.md).

> **⏳ Not yet available — group messaging.** There are no groups, no multicast, and no
> broadcast in LXMF. Every recipient is a separate send. Attachments and history sync are
> also out of scope for v1. See [LIMITATIONS.md §7](../LIMITATIONS.md).

The UI never claims more than it knows. A roster entry is either "answered" or "not yet" —
there is deliberately no "offline", "failed", or "unreachable" state, because the app has no
way to distinguish those from "busy" or "will answer in an hour".

Full source: [apps/roll-call/bundle.js](apps/roll-call/bundle.js).

### Make it yours

- **Add a round id.** Right now a reply to yesterday's roll call counts toward today's.
  Include a round nonce, same trick as Signal check.
- **Pace the fan-out.** Insert a delay between sends and show progress. On a slow interface
  this turns an unresponsive app into a working one.
- **Persist the answers.** Currently a `Map` that dies with the app. `storage:kv` is already
  granted; this is four lines.
- **Relay the roster.** Have each answering peer include *their* roster, and merge. You have
  now built gossip, along with all of gossip's problems — start with a hop count.

---

## Dead drop

> **Capabilities:** `identity`, `lxmf:send`, `lxmf:receive`

Hands a short signed note to one peer, who can verify which app identity produced it.
Included because signing is the single most misunderstood thing in the SDK.

![Dead drop with a received signed note](/cookbook/images/04-dead-drop.png)

**Screenshot 4.4 — Dead drop.** The mini-app surface: a recipient input, a multiline note
box containing two sentences, a row of two buttons (**Drop it**, **Collect**), a divider,
and one received note rendered as a body line with a small grey second line reading "signed
3f9a2c1e40b7d8e5… by 9c31f7a2e4b0d5…".

### The interesting part

```javascript
const signature = await identity.sign(new TextEncoder().encode(payload));
```

The private key does not exist inside the sandbox. `identity.sign` is a broker call: your
code hands over bytes and gets back a signature, and at no point does it hold anything it
could exfiltrate. This is why an app can be trusted with `identity` at all.

What that signature proves, exactly:

**It does prove** that this app, running on this host, with this app-scoped identity,
produced these bytes.

**It does not prove** that the human holding that host is who you think they are; that the
contents are true; that the message is recent; or that it was meant for you. A signature is
an authenticity claim about an identity, not about a person and not about a fact.

Two attacks this recipe does not stop, deliberately left in so you can fix them:

- **Replay.** The envelope has no timestamp and no nonce, so a signed note can be captured
  and re-sent forever. Add a timestamp *inside* the signed payload — outside it, it is just
  a suggestion.
- **Rebinding.** The envelope carries `from` as a field, but nothing ties the signature to
  the sender's address. Sign a structure that includes the address, not just the text.

Both fixes are the same shape: sign more, and sign the thing you actually care about. The
comment at the top of the file says as much.

Full source: [apps/dead-drop/bundle.js](apps/dead-drop/bundle.js).

> **⏳ Not yet available — key rotation and revocation.** There is no way to rotate or revoke
> an app identity in v1. A signature you accept today, you accept forever, and a compromised
> device stays trusted. See [docs/package-format.md](../docs/package-format.md) §1.

### Make it yours

- **Add the timestamp and address to the signed payload.** Twenty minutes, and it is the
  difference between a demo and something you would use.
- **Verify on receipt.** The recipe displays the signature; it does not check it. Verification
  needs the sender's public key, which means you need to have exchanged one — which is the
  real work in any of this.
- **Expire notes.** Delete anything older than an hour, and refuse anything whose signed
  timestamp is in the future.

---

## What this chapter was actually about

The correlation and delivery problems are yours. Every one of these recipes solves them with
the same three pieces: a nonce you invent, a subject you namespace, and a UI that
distinguishes "no answer yet" from "no".

The temptation is always to build the missing layer — sessions, acknowledgements, retries —
once, properly, and share it between your apps. You cannot: there is no IPC and no shared
storage between mini-apps, deliberately. Each app carries its own copy. See
[LIMITATIONS.md §7](../LIMITATIONS.md).

---

Next: [Apps that find each other](05-apps-that-find-each-other.md) — announce, and what
happens when there is no source of truth.
