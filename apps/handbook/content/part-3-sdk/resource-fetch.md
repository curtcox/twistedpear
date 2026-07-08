# Resource fetch

`resource:fetch` asks the host to pull a Resource through its budget rules.
The mini-app never sees sockets or peer handles — only bytes (or a typed error).

## API

```javascript
import { resource } from "@twistedpear/miniapp-sdk";

const bytes = await resource.fetch({
  resourceId: "offer:demo",
  budgetBytes: 4096
});
```

## Live probe

{{applet:resource-fetch}}
