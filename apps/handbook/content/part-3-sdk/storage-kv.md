# Key/value storage

`storage:kv` is a per-app local store with a byte quota enforced by the host.

## API

```javascript
import { storage } from "@twistedpear/miniapp-sdk";

await storage.kv.set("key", bytes);
const value = await storage.kv.get("key");
await storage.kv.delete("key");
```

## Live probe

{{applet:storage-kv}}
