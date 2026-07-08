# Presence

The `presence` capability lets a mini-app read coarse peer and interface state
without raw sockets or interface handles.

## API

```javascript
import { presence } from "@twistedpear/miniapp-sdk";

const snap = await presence.snapshot();
// { onlineInterfaces, preferredInterface, peers }
```

## Live probe

{{applet:presence-snapshot}}
