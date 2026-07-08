# Publish & install

`apps:publish` announces a packaged 256t id under the publisher identity.
`apps:install` asks the host to fetch, verify, and review capabilities before
anything runs. Both raise a confirmation dialog on every call.

## API

```javascript
import { apps } from "@twistedpear/miniapp-sdk";

await apps.publish(t256);
const installed = await apps.install(t256);
```

## Live probe

{{applet:apps-publish-install}}
