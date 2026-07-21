# 3. Apps that remember

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

TwistedPear gives a mini-app two stores, and choosing between them takes about ten seconds
once you know the rule:

| | `storage:kv` | `storage:hyperbee` |
|---|---|---|
| Shape | Bytes at a key | Structured values at a key |
| Listing | No — you must know the key | Yes — ordered range scans |
| Ordering | None | Lexicographic, always |
| History | None; a write overwrites | Kept, and it counts against your quota |
| Good for | A handful of known keys | A collection that grows |

**The rule:** if you can name every key you will ever read, use KV. If you will ever want
"the last twenty of something", use Hyperbee.

Both are per-app and per-device. Neither is shared with any other app, and neither
replicates anywhere.

> **⏳ Not yet available — Hyperbee replication.** v1 Hyperbee is strictly local. Two devices
> running the same app share nothing. If your design says "syncs across my devices", it does
> not, and there is no topic to subscribe to that will make it. See
> [docs/miniapp-sdk.md](../docs/miniapp-sdk.md).

![The four storage apps and the host's per-app quota panel](/cookbook/images/03-chapter-opener.png)

**Screenshot 3.1 — Chapter opener.** A 2×2 grid of host captures: Pocket notes with a
half-page of text and "Saved 412 characters"; Streak tracker showing "9 day streak" and a
toggle switched on; Field log with five timestamped entries; Split the bill showing three
people and a settle-up line. Below the grid, the host's storage panel for one app, showing a
quota bar labelled "Pocket notes — 4 KiB of 1 MiB used".

| Recipe | Capabilities | Directory |
|---|---|---|
| [Pocket notes](#pocket-notes) | `storage:kv` | [apps/pocket-notes](apps/pocket-notes/README.md) |
| [Streak tracker](#streak-tracker) | `storage:kv` | [apps/streak-tracker](apps/streak-tracker/README.md) |
| [Field log](#field-log) | `storage:hyperbee` | [apps/field-log](apps/field-log/README.md) |
| [Split the bill](#split-the-bill) | `storage:hyperbee` | [apps/split-the-bill](apps/split-the-bill/README.md) |

---

## Pocket notes

> **Capabilities:** `storage:kv`

One text box whose contents survive restarts. The smallest possible app that remembers
anything, and the right place to learn the two things every storage app must handle.

![Pocket notes with unsaved changes](/cookbook/images/03-pocket-notes.png)

**Screenshot 3.2 — Pocket notes.** The mini-app surface with a heading "Pocket notes", a
tall multiline text input containing four short lines of notes, **Save** and **Clear**
buttons in a row beneath, and a small status line reading "Unsaved changes".

### The interesting part

**One: the first run.** `storage.kv.get` returns `null`, not an empty buffer, and not an
error. Every KV read in this cookbook has this branch.

```javascript
const stored = await storage.kv.get(KEY);
text = stored === null ? "" : decoder.decode(stored);
```

**Two: the grant going away mid-run.** The user can revoke `storage:kv` from the host's
Grants panel while your app is on screen. The next call throws a `CapabilityError`. This is
not an edge case worth skipping — it is a supported user action, and the host will not warn
you before it happens.

```javascript
try {
  await storage.kv.set(KEY, encoder.encode(text));
  status = `Saved ${text.length} characters`;
} catch (error) {
  status = "Save failed — storage unavailable";
}
```

The app keeps working as a scratchpad. It does not crash, and — this is the part that
matters — it does not lie. It tells the user the text is not being saved. An app that
silently swallows the error and leaves "Saved" on screen has turned a permission decision
into data loss.

![The host Grants panel with storage revoked for a running app](/cookbook/images/03-revoked-grant.png)

**Screenshot 3.3 — A revoked grant, live.** A two-panel composite. Left: the host's Grants
panel headed "Grants for Pocket notes", with `storage:kv` toggled **off** and annotated
"revoked — the app will see this as unavailable". Right: the same app still running, now
showing "Save failed — storage unavailable" in its status line with the typed text still
visible and intact.

Full source: [apps/pocket-notes/bundle.js](apps/pocket-notes/bundle.js).

### Make it yours

- **Autosave on a debounce.** Careful: an autosave on every keystroke is a broker call on
  every keystroke, and the ceiling is 60 per second.
- **Multiple notes.** Now you need a list, which means you need to enumerate keys, which KV
  cannot do. Either keep an index key holding an array of names, or switch to Hyperbee. The
  index-key trick works fine up to a few hundred entries and badly after that.
- **A character budget.** Show how much of the app's KV quota the note occupies, read from
  `host.info().quota` — which costs you the `presence` capability.

---

## Streak tracker

> **Capabilities:** `storage:kv`

Marks a habit done for the day, counts consecutive days. The example of putting *structure*
into a store that only holds bytes.

![Streak tracker showing a nine-day streak](/cookbook/images/03-streak-tracker.png)

**Screenshot 3.4 — Streak tracker.** The mini-app surface: heading, "9 day streak" in very
large bold type, a switch labelled "Done today (2026-07-21)" in the on position, a divider,
and a list of ten dates each prefixed with a check mark, most recent first.

### The interesting part

KV stores bytes. Anything structured is your encoding problem, and JSON is the right answer
at this size and the wrong answer at a megabyte.

```javascript
async function persist() {
  // Keep the document bounded — a year of dates is about 4 KiB, and the app's whole
  // KV quota is shared with everything else it ever stores.
  state.days = [...new Set(state.days)].sort().slice(-366);
  await storage.kv.set(KEY, encoder.encode(JSON.stringify(state)));
}
```

Two decisions worth copying. The value is **deduplicated and bounded on every write**, so
the document cannot grow without limit no matter how the app is used. And the read path
treats stored bytes as untrusted:

```javascript
try {
  const parsed = JSON.parse(decoder.decode(stored));
  if (Array.isArray(parsed.days)) state = { days: parsed.days };
} catch (error) {
  status = "Stored state was unreadable; starting fresh";
}
```

That `catch` protects against your own past self more than anything else. The first time you
change the shape of a persisted document and ship it, some user has the old shape on disk,
and an app that throws during startup is an app that can never be fixed by a later version —
because it dies before it can migrate anything.

The date arithmetic is deliberately UTC-only and library-free. There is no bundler, so
adding a date library means pasting one in; at this size, `toISOString().slice(0, 10)` is
better than the dependency.

Full source: [apps/streak-tracker/bundle.js](apps/streak-tracker/bundle.js).

### Make it yours

- **Track more than one habit.** The document becomes `{ habits: { name: string[] } }` — and
  now you have a migration to write. Do it once here, on a toy, and you will never skip a
  version field again.
- **Add a version field.** Seriously. `{ v: 1, days: [] }`, and branch on `v` in the loader.
- **Show a heat map.** A 7×N grid of `view` nodes with a background colour per cell. Count
  the nodes: a year is 366 cells, well inside the 5,000-node tree limit, but a decade is not.

---

## Field log

> **Capabilities:** `storage:hyperbee`

An append-only log of timestamped observations, listed newest first. The recipe that
explains why Hyperbee's ordering rule is the whole point of Hyperbee.

![Field log with several observations](/cookbook/images/03-field-log.png)

**Screenshot 3.5 — Field log.** The mini-app surface: heading "Field log", a text input
reading "What did you observe?", a **Log it** button, a divider, and a scrolling list of six
entries. Each entry is two lines: a small grey timestamp such as "2026-07-21 14:02:11" and
the observation text beneath it. A status line at the bottom reads "Logged · 34 entries held
locally".

### The interesting part

Hyperbee keys sort lexicographically. Always, and only. There is no secondary index, no
sort option, and no query language — so the key is the only tool you have for controlling
what order things come back in, and it is enough.

```javascript
function keyFor(date) {
  // Descending key: larger timestamps sort earlier.
  const reverse = 10_000_000_000_000 - date.getTime();
  return `obs/${String(reverse).padStart(14, "0")}`;
}

const listed = await storage.bee.list(bee, { gte: "obs/", lt: "obs0", limit: 50 });
```

Three separate tricks in four lines:

- **Zero-padding** makes lexicographic order agree with numeric order. Without it, `"9"`
  sorts after `"10"` and your log is scrambled.
- **Subtracting from a large constant** makes newest-first the natural scan order, so the
  app never sorts anything in memory.
- **`lt: "obs0"`** bounds the scan to the `obs/` prefix, because `"0"` is the next character
  after `"/"` in ASCII. That is the idiomatic way to say "this prefix and nothing else".

The payoff: showing the fifty most recent entries out of fifty thousand costs a scan of
fifty. Get the key wrong and the same screen costs reading everything you have ever stored.

Also note what is not here: no delete, no edit. It is an append-only log by design, which
means there is no partial-write state to recover from if the app is killed mid-operation.

> **⚠️ Works, with limits — Hyperbee history counts against your quota.** Every `put` is
> retained in the underlying log, so a key rewritten a thousand times costs a thousand
> entries' worth of bytes, not one. An append-only design sidesteps this; an
> update-in-place design does not.

Full source: [apps/field-log/bundle.js](apps/field-log/bundle.js).

### Make it yours

- **Add a category prefix.** Key on `obs/<category>/<reverse-time>` and the same range-scan
  trick gives you per-category listing for free.
- **Add search.** There is no index, so search means scanning. Bound it: scan the most recent
  N and say so in the UI, rather than pretending to search everything.
- **Export it.** Serialise the scan to text and hand it to `share.put` — see
  [Chapter 6](06-apps-that-move-files.md).

---

## Split the bill

> **Capabilities:** `storage:hyperbee`

Tracks who paid for what on a shared trip and works out who owes whom. The recipe for
**deriving state instead of storing it**.

![Split the bill with a settle-up summary](/cookbook/images/03-split-the-bill.png)

**Screenshot 3.6 — Split the bill.** The mini-app surface: three stacked inputs (Who paid,
For what, Amount), an **Add** button, a divider, a bold summary line reading "Total 184.50 ·
3 people · 61.50 each", and three lines beneath it: "Ana is owed 42.00", "Ben owes 18.50",
"Cass owes 23.50".

### The interesting part

The store holds only what happened. Every number on screen is computed on read.

```javascript
function totals() {
  const byPerson = new Map();
  for (const entry of entries) {
    byPerson.set(entry.who, (byPerson.get(entry.who) ?? 0) + entry.cents);
  }
  const people = [...byPerson.keys()];
  const total = [...byPerson.values()].reduce((a, b) => a + b, 0);
  const fairShare = people.length === 0 ? 0 : Math.round(total / people.length);
  return { total, people, fairShare, byPerson };
}
```

This is the only shape that survives an app being killed mid-write, and on this platform apps
*are* killed mid-write: the host has a runaway-app watchdog, the user can stop an app at any
moment, and on mobile the OS can take the whole host away. An app that maintains a running
balance alongside a list of entries has two sources of truth that can disagree, and no
transaction to keep them honest.

The second detail is money in integer cents:

```javascript
const cents = Math.round(Number.parseFloat(amount) * 100);
```

`0.1 + 0.2` is not `0.3` in any language with IEEE floats, and a bill-splitting app that is
off by a cent is a bill-splitting app that starts an argument.

> **⚠️ Works, with limits — the runaway-app watchdog.** Thresholds are untuned on low-end
> hardware and may stop an app that is merely slow. Assume you can be killed at any point
> between two `put` calls. See [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) (H11).

Full source: [apps/split-the-bill/bundle.js](apps/split-the-bill/bundle.js).

### Make it yours

- **Uneven splits.** Add a weight per person; `fairShare` becomes a weighted division. The
  ledger shape does not change at all, which is the point.
- **Multiple trips.** Key on `e/<trip>/<time>` and scan per trip.
- **Settle up over the air.** Send the ledger to the other people on the trip — which is
  [Chapter 4](04-apps-that-talk-to-one-peer.md), and immediately raises the question of what
  happens when two people add the same expense. There is no answer built into the platform;
  merge is your problem.

---

## What this chapter was actually about

Three rules, in order of how much pain they save:

1. **Store events, derive views.** You will be killed mid-write. Append-only designs do not
   care.
2. **Bound everything.** Every document, every list, every scan. The limits are real and
   they are not generous.
3. **Choose the key first.** In Hyperbee the key *is* the query planner, and you cannot add
   an index later.

---

Next: [Apps that talk to one peer](04-apps-that-talk-to-one-peer.md) — messaging without
sessions, servers, or delivery guarantees.
