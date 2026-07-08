# Announce & subscribe

Announces are how destinations advertise reachability. Mini-apps publish and
subscribe in an app namespace through the host broker.

## API

```javascript
import { announce } from "@twistedpear/miniapp-sdk";

await announce.publish(appDataBytes, "my-namespace");
const events = await announce.subscribe("my-namespace");
```

## Live probe

{{applet:announce-loop}}
