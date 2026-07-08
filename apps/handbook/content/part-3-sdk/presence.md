# Presence

The `presence` capability lets a mini-app read coarse peer and interface state
and host metadata (`host.info`) without raw sockets or interface handles.

## API

```javascript
import { presence, host } from "@twistedpear/miniapp-sdk";

const snap = await presence.snapshot();
// { onlineInterfaces, preferredInterface, peers }

const info = await host.info();
// { platform, hostVersion, hostApiVersion, roles, interfaceTypes, quotas }
```

## Live probe

{{applet:presence-snapshot}}

See also the [live difference matrix](chapter:difference-matrix) (`host.info`).
