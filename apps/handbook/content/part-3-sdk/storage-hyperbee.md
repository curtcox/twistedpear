# Hyperbee storage

`storage:hyperbee` opens a local-only ordered key/value store (Hyperbee)
namespaced to the app. Keys stay sorted so list ranges are useful for feeds
and indexes.

## API

```javascript
import { storage } from "@twistedpear/miniapp-sdk";

await storage.bee.open();
await storage.bee.put("post:1", bytes);
const value = await storage.bee.get("post:1");
const entries = await storage.bee.list({ limit: 10 });
await storage.bee.del("post:1");
```

## Live probe

{{applet:storage-hyperbee}}
