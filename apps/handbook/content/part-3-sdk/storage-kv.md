# Key/value storage

`storage:kv` is a per-app local store with a byte quota enforced by the host. Values
are opaque byte arrays — encode JSON or UTF-8 in the sandbox before writing.

## When to use KV

Use KV for small persistent state: settings, last-read positions, cached tokens.
For ordered iteration or large datasets, prefer [Hyperbee storage](chapter:sdk-storage-hyperbee).

## API

```javascript
import { storage } from "@twistedpear/miniapp-sdk";

await storage.kv.set("key", bytes);
const value = await storage.kv.get("key");
await storage.kv.delete("key");
```

The Handbook persists reading position and seed version in KV.

## Outcomes

- `pass` — round-trip write/read/delete succeeded.
- `not-granted` — `storage:kv` withheld.

## Live probe

{{applet:storage-kv}}

Quotas: [Quotas & limits](chapter:ref-quotas).
