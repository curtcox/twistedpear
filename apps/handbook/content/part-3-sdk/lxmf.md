# LXMF messaging

`lxmf:send` and `lxmf:receive` give a mini-app a namespaced mailbox. Private
keys stay in the host; the app only sees deliveries for its destination.

## API

```javascript
import { lxmf } from "@twistedpear/miniapp-sdk";

await lxmf.send({ to: peerAppId, subject: "hello", body: "hi" });
const inbox = await lxmf.receive();
```

## Live probe

{{applet:lxmf-roundtrip}}

See also [Identity & signing](chapter:sdk-identity).
