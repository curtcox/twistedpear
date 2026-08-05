# 6. Storage and files

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Three storage surfaces, three capabilities, three purposes. All are **local-only** and all
are **per-app**: another mini-app cannot read yours, and yours cannot read theirs.

| Surface | Capability | For | Shape |
|---|---|---|---|
| `storage.kv` | `storage:kv` | Settings, cursors, small state | Key → bytes |
| `storage.bee` | `storage:hyperbee` | Ordered records you range over | Sorted key/value with history |
| `workspace` | `workspace` | Editable project source files | Path → string |

## Key/value

```javascript
import { storage } from "@twistedpear/miniapp-sdk";

await storage.kv.set("last-peer", new TextEncoder().encode(peer));

const saved = await storage.kv.get("last-peer");
const value = saved === null ? "" : new TextDecoder().decode(saved);

await storage.kv.delete("last-peer");
```

Values are bytes, not strings — encode and decode yourself, as the `chat` example does. A
missing key returns `null`; it does not throw.

This is the right place for anything you would put in `localStorage`: the last peer, a UI
preference, a sync cursor. It is the wrong place for a growing collection, because there is
no range query and everything counts against one quota.

## Hyperbee

```javascript
const bee = await storage.bee.open("posts");

await bee.put("2026-07-21T09:00:00Z", encoded);
const entry = await bee.get("2026-07-21T09:00:00Z");
for await (const item of bee.list({ gte: "2026-07-01", lt: "2026-08-01" })) {
  // ordered by key
}
await bee.del("2026-07-21T09:00:00Z");
```

Keys sort lexicographically, so design them to sort the way you want to read them —
timestamps in ISO-8601, ids zero-padded. The `board` example uses exactly this shape.

**History counts against your quota.** A Hyperbee keeps its append-only log, so a key you
overwrite a thousand times costs a thousand entries' worth of bytes, not one. If you have a
value that churns, put it in KV.

> **⏳ Not yet available — Hyperbee replication.** v1 Hyperbee is strictly local. There is no
> cross-device sync, no shared topic, and no replication between peers — a "shared board" is
> shared only in the sense that each peer keeps their own copy of what they heard announced.
> Cross-device sync topics are future work. See [docs/miniapp-sdk.md](../docs/miniapp-sdk.md).

## Workspace

The workspace is your app's private project source tree. It exists so an app can *edit code* —
DevStudio is the reason it exists — and the `code-editor` widget resolves its content from
here.

```javascript
import { workspace } from "@twistedpear/miniapp-sdk";

const files = await workspace.list("hello-app/");
const source = await workspace.read("hello-app/bundle.js");
await workspace.write("hello-app/bundle.js", updated);
await workspace.remove("hello-app/old.js");
```

Content is **strings**, not bytes — this is a source-file store, not a blob store. Paths are
strictly relative: no leading slash, no `..`, no escaping your own tree.

Limits: **256 KiB per file, 4 MiB total, 512 files per app.** `code-editor` emits bounded
text edits and DevStudio applies them with `workspace.patch`; stale base lengths fail rather
than overwriting a concurrent change. The per-file ceiling remains a host safety quota.

## Quotas, and what happens when you hit one

| Store | Limit |
|---|---|
| KV | Host-configured byte quota per app |
| Hyperbee | Shares the KV pool; history counts |
| Workspace | 256 KiB/file, 4 MiB total, 512 files |

A write over quota **fails**. It does not evict, it does not silently truncate, and there is
no callback warning you as you approach the line. Handle the failure:

```javascript
try {
  await storage.kv.set(key, bytes);
} catch (error) {
  // Out of quota, or the host tightened it while you were running.
  await showStorageFullNotice();
}
```

Quotas are also **adjustable at runtime by the host** — the desktop Runtime controls panel
can tighten an app's KV quota while it runs, and the change applies to your next call. So a
write that succeeded a minute ago can fail now, without your app doing anything differently.

![The desktop Runtime controls panel showing per-app storage use and limits](/authors/images/06-runtime-storage.png)

**Screenshot 6.1 — Storage as the user sees it.** The desktop host's Runtime controls panel
for a running app. Rows: "Messages/sec limit: 60" with a stepper; "KV quota: 2 MiB" with a
stepper and a usage bar showing about 40% filled and the label "812 KiB used"; "Memory limit:
64 MiB" with a stepper and a grey note reading "applies at next launch". At the bottom, a
**Force quit** button. The point of the shot is that the user, not the app, holds these dials.

Memory limits behave differently from the other two: rate and storage changes apply
immediately, but a memory change maps to worker spawn limits and takes effect at your **next
launch** (the host reports this as `memoryPendingRestart`).

## What is not here

- **No shared storage between apps.** Deliberately deferred, not missing.
- **No cloud, no backup, no sync.** If the user uninstalls your app, their data is gone; if
  the device dies, it is gone. Say so in your app if that would surprise anyone.
- **No transactions across surfaces.** A KV write and a Hyperbee put are two independent
  operations.

> **⚠️ Works, with limits — browser storage is evictable.** On the web host, storage lives in
> OPFS/IndexedDB under browser quota and can be cleared by the user agent at any time.
> `navigator.storage.persist()` mitigates but does not guarantee. Do not assume durability on
> that target. See [LIMITATIONS.md §8](../LIMITATIONS.md).

## Choosing

- Small, bounded, read at startup → **KV**.
- Grows over time, read in ranges → **Hyperbee**.
- The user edits it as text → **workspace**.
- Bigger than a few megabytes → reconsider. You are on a platform where a peer may be
  reaching you over a link that moves hundreds of bits per second
  ([Chapter 12](12-limits-and-budgets.md)).
