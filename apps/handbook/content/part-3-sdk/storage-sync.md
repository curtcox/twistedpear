# Replicated topic log

<!-- tp-doc
lifecycle: live
audited: 2026-08-25
register: none
-->

`storage:sync` stores a host-merged topic log for this app. The sandbox appends
entries; the host owns merge, caps, and any later replication. Apps never speak
the replica wire format.

## When to use a topic log

Use a topic log for shared structured state that must converge across installs:
a board, a roster, a last-write-wins map. For private settings, prefer
[key/value storage](chapter:sdk-storage-kv). For local ordered data that does
not merge, prefer [Hyperbee storage](chapter:sdk-storage-hyperbee).

## API

```javascript
import { storage } from "@twistedpear/miniapp-sdk";

await storage.sync.open("board");
await storage.sync.append("board", { title: "hello" }, { key: "item-1" });
const view = await storage.sync.view("board");
```

```elm
StorageSync.open "board" GotOpened
StorageSync.append "board" payload (Just "item-1") GotAppended
StorageSync.view "board" GotView
```

Replication is host-owned. An LXMF round needs a live egress offer and is
metered by the daily budget. The sandbox sees only the merged view.

## Outcomes

- `pass` — open/append/view round-trip succeeded.
- `not-granted` — `storage:sync` withheld.

## Live probe

{{applet:storage-sync}}
