# Hyperbee storage

<!-- tp-doc
lifecycle: live
audited: 2026-08-20
register: none
-->

`storage:hyperbee` opens a local-only ordered key/value store (Hyperbee)
namespaced to the app. Keys stay sorted so list ranges are useful for feeds
and indexes.

## KV vs Hyperbee

| Store    | Best for                         |
| -------- | -------------------------------- |
| KV       | Small opaque blobs, settings     |
| Hyperbee | Sorted keys, pagination, indexes |

Both are local to the app install and quota-enforced by the host. Hyperbee data
does not sync to other devices unless your app implements its own exchange.

## API

```javascript
import { storage } from "@twistedpear/miniapp-sdk";

await storage.bee.open();
await storage.bee.put("post:1", bytes);
const value = await storage.bee.get("post:1");
const entries = await storage.bee.list({ limit: 10 });
await storage.bee.del("post:1");
```

```elm
StorageBee.open GotBee
StorageBee.put "post:1" bytes GotPut
StorageBee.get "post:1" GotValue
StorageBee.list (E.object [ ( "limit", E.int 10 ) ]) GotEntries
StorageBee.del "post:1" GotDel
```

## Outcomes

- `pass` — put/get/list/delete round-trip succeeded.
- `not-granted` — `storage:hyperbee` withheld.

## Live probe

{{applet:storage-hyperbee}}

See also [Key/value storage](chapter:sdk-storage-kv).
