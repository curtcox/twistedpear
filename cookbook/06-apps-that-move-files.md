# 6. Apps that move files

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Three different things in the SDK look like "files" and are not interchangeable. Getting them
straight takes one table and saves a lot of confusion.

| | What it is | Scope | Costs airtime? |
|---|---|---|---|
| `share.put` / `share.get` | Content-addressed bytes, named by a 94-character 256t identifier | Anyone who can resolve the identifier | Yes, on `get` |
| `resource.fetch` | A budgeted pull of a resource the host knows how to reach | Whatever the host can reach | Yes, and the host caps it |
| `workspace.*` | A private, per-app filesystem on this device | This app, this device | No |

**The rule:** `share` is for bytes other people should be able to get. `workspace` is for
bytes only you need. `resource.fetch` is how you pull something large without the host
letting you monopolise the link.

## The thing that surprises everyone

`share.get` is not a lookup service.

> **⚠️ Works, with limits — resolving a 256t identifier.** An identifier resolves only if a
> locator announce for those bytes was already heard by this host. There is no re-request, no
> DHT walk, and no "go and find it". If nobody announced it while you were listening, a
> perfectly valid 94-character identifier is just a string. See
> [LIMITATIONS.md §7](../LIMITATIONS.md).

In practice this means content sharing on TwistedPear is a two-step social act: somebody
publishes, somebody else has to have been present. It is closer to handing over a physical
copy than to opening a URL.

![The three file apps and a transfer in progress](/cookbook/images/06-chapter-opener.png)

**Screenshot 6.1 — Chapter opener.** Three host captures in a row: Photo drop with a QR code
and a fetch in progress showing a byte count, Zine reader displaying page 3 of 7 of a text
publication, and Recipe box with a file list of nine recipes and one open in the editor.
Beneath them, the host's own transfer indicator showing a rate readout in bytes per second on
a slow interface.

| Recipe | Capabilities | Directory |
|---|---|---|
| [Photo drop](#photo-drop) | `share:cas`, `resource:fetch`, `storage:kv` | [apps/photo-drop](apps/photo-drop/README.md) |
| [Zine reader](#zine-reader) | `share:cas`, `workspace` | [apps/zine-reader](apps/zine-reader/README.md) |
| [Recipe box](#recipe-box) | `workspace` | [apps/recipe-box](apps/recipe-box/README.md) |

---

## Photo drop

> **Capabilities:** `share:cas`, `resource:fetch`, `storage:kv`

Puts bytes into content-addressed storage, hands the identifier to somebody, and fetches
theirs. The recipe that shows `share` and `resource.fetch` side by side so the difference is
concrete.

![Photo drop with a 256t identifier as a QR code](/cookbook/images/06-photo-drop.png)

**Screenshot 6.2 — Photo drop.** The mini-app surface: a **Share a payload** button, a text
input containing a full 94-character 256t identifier (wrapped across two lines), a QR code
rendered beneath it, a budget input reading "256", a **Fetch** button, a divider, a short
text preview of fetched content, and a list of four previously used identifiers as buttons.
The status line reads "Fetched 1,024 bytes".

![The same identifier being scanned on a phone](/cookbook/images/06-photo-drop-scan.png)

**Screenshot 6.3 — Handing over an identifier.** A two-device composite: on the left, a
desktop host at 1280×800 showing Photo drop with the QR code large on screen; on the right, a
portrait phone screenshot of the Android host's scanner overlay framing that same code, with
a confirmation strip reading "Identifier captured". This is the intended way to move a 256t
string between devices.

### The interesting part

The budget is the point of `resource.fetch`:

```javascript
bytes = await resource.fetch({
  resourceId: identifier.trim(),
  budgetBytes: budgetKib * 1024
});
```

You state a ceiling, and the host applies its own on top of yours — whichever is smaller
wins. You cannot raise your limit above the host's, and you should not want to: the host is
protecting a link that the user shares with every other app and, on a radio interface, with
every other person nearby.

Three failure modes come back through the same `catch`, and the recipe deliberately does not
try to distinguish them:

```javascript
} catch (error) {
  // Over budget, no locator announce heard, or the link went away mid-transfer.
  status = `Fetch failed: ${error?.message ?? "unavailable"}`;
}
```

Also note the length check before the call:

```javascript
if (identifier.trim().length !== 94) {
  status = "A 256t identifier is 94 characters";
  return;
}
```

A 256t identifier is always exactly 94 characters, so a client-side check turns a typo into
an instant message instead of a slow failure — which on a bad link is the difference between
a two-second correction and a forty-second one.

The QR code is the intended transport for the identifier itself.

> **⚠️ Works, with limits — QR scanning is mobile-only.** Desktop hosts render QR codes but
> cannot scan them; on desktop you paste the string. Design the flow so pasting works and
> scanning is the shortcut, not the other way round.

Full source: [apps/photo-drop/bundle.js](apps/photo-drop/bundle.js).

### Make it yours

- **Share real images.** The sample generates a text payload to stay self-contained. Wiring a
  real picker is host-surface work and the shape of the code does not change.
- **Show a progress bar.** Fetches on a slow link take long enough that a spinner is not
  enough; the user needs to see bytes moving or they will assume it has hung.
- **Refuse over-budget fetches early.** Check the size before committing, and tell the user
  what it will cost in seconds on their current interface — `host.info()` from
  [Link weather](05-apps-that-find-each-other.md#link-weather) tells you which interface that
  is.
- **Cache what you fetched.** Which is the next recipe.

---

## Zine reader

> **Capabilities:** `share:cas`, `workspace`

Fetches a small publication by identifier and reads it page by page. The recipe about
caching, which on this platform is not a performance trick but a courtesy.

![Zine reader on page three](/cookbook/images/06-zine-reader.png)

**Screenshot 6.4 — Zine reader.** The mini-app surface: an identifier input and **Open**
button at the top, two "Cached: …" buttons beneath, a divider, a scrolling body of text
filling most of the surface, and a navigation row at the bottom with ◀ / "3 / 7" / ▶. The
status line reads "Read from cache — no bytes over the air".

### The interesting part

```javascript
async function open(t256) {
  const path = cachePath(t256);
  if (cached.includes(path) || cached.includes(path.split("/").pop())) {
    pages = (await workspace.read(path)).split("\n---\n");
    status = "Read from cache — no bytes over the air";
    return;
  }
  // …otherwise fetch, then write to the workspace
}
```

Content addressing makes this cache trivially correct. The identifier *is* a hash of the
bytes, so a cache hit cannot be stale — there is no invalidation problem, no ETag, no
expiry. Different bytes are a different identifier by definition.

Re-fetching on every launch is not a mild inefficiency here. On a shared radio channel it is
airtime taken from everyone in range, repeatedly, for content you already have on disk. An
app that does this is rude in a way that has no equivalent on the web.

The size check exists because the workspace has a hard ceiling:

```javascript
// 256 KiB per workspace file. A zine that does not fit is a zine that needs splitting.
if (text.length > 256 * 1024) {
  status = "Too large for one workspace file (256 KiB limit)";
  return;
}
```

> **⚠️ Works, with limits — the workspace ceiling.** 256 KiB per file, 4 MiB and 512 files
> per app. The per-file limit exists because the `code-editor` widget has no delta protocol
> yet, so anything held in a workspace file has to be transferred whole.

Full source: [apps/zine-reader/bundle.js](apps/zine-reader/bundle.js).

### Make it yours

- **Chunk large content.** Fetch and store in 200 KiB pieces with an index file. This is the
  general fix for the per-file limit and it is worth writing once.
- **Evict old caches.** 4 MiB fills faster than you expect. Least-recently-read is fine.
- **Share what you read.** Add `announce:publish` and republish the identifiers you liked —
  which is a recommendation feed, built out of nothing but hashes.

---

## Recipe box

> **Capabilities:** `workspace`

Text recipes as workspace files, with a list, an editor, and a delete. The plainest possible
demonstration of the workspace as an actual filesystem, and of all three of its limits.

![Recipe box with a file list and open editor](/cookbook/images/06-recipe-box.png)

**Screenshot 6.5 — Recipe box.** The mini-app surface: a "New recipe" input with a
**Create** button beside it, a list of nine file buttons with names like
`recipes/soda-bread.md`, a divider, a tall multiline editor showing a markdown recipe with
"# Soda bread", "## Ingredients", "## Method" headings, a row of **Save** / **Delete**
buttons, and a status line reading "Saved · 9/512 files".

### The interesting part

Every path is sanitised before it is used:

```javascript
function pathFor(name) {
  const safe = name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-");
  return safe.length === 0 ? null : `${DIR}/${safe}.md`;
}
```

Workspace paths are strictly relative and the broker rejects traversal attempts, so this is
belt and braces rather than the only line of defence. Do it anyway: an allowlist of
characters is four lines, and it also means filenames stay legible when someone reads the
directory listing.

Both quantitative limits are checked before the write, not caught after:

```javascript
if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
  status = "Too large — the per-file limit is 256 KiB";
  return;
}
```

```javascript
if (files.length >= MAX_FILES) {
  status = `At the ${MAX_FILES}-file ceiling — delete something first`;
  return;
}
```

Note `TextEncoder().encode(text).length` rather than `text.length`. Limits are in bytes;
JavaScript string length is in UTF-16 code units. A recipe written in Japanese hits the limit
at roughly a third of the character count you would guess, and an app that measures the wrong
thing will let the user type happily until the write fails.

The file count is shown permanently in the status line — a limit the user can see is a limit
they can plan around.

Full source: [apps/recipe-box/bundle.js](apps/recipe-box/bundle.js).

### Make it yours

- **Add folders.** Workspace paths are hierarchical; `recipes/bread/soda-bread.md` works
  today and the listing code barely changes.
- **Add search.** Read every file and scan. At 512 files this is fine; write it so it is
  obvious why it would not be at 50,000.
- **Share a recipe.** `share.put` the text and show the identifier. Combined with
  [Zine reader](#zine-reader), you have a two-app publishing pipeline.
- **Back it up.** There is no export, and uninstalling the app takes the workspace with it.
  A "copy everything to one shareable blob" button is genuinely useful.

---

## What this chapter was actually about

Bytes cost. On IP they cost nothing you will notice; on BLE and LoRa they cost seconds of a
channel that everybody in range is sharing. Three habits follow:

1. **Cache aggressively.** Content addressing makes it correct for free.
2. **Budget explicitly.** State a ceiling on every fetch, and check what interface you are on
   before you commit to a big one.
3. **Check limits before the call, in bytes, not characters.**

---

Next: [Apps that use a model](07-apps-that-use-a-model.md) — one in-flight request, untrusted
output, and working when the model is gone.
