# Packaging & preview

`apps:package` and `apps:preview` are double-gated: the capability grant plus a
host-chrome confirmation the mini-app cannot dismiss. Package signs under the
device publisher identity; preview runs the project in the single sandboxed
dev-preview slot.

## API

```javascript
import { apps } from "@twistedpear/miniapp-sdk";

const packed = await apps.packageProject("my-app", manifest);
const { launched } = await apps.preview("my-app", manifest, grants);
await apps.stopPreview();
```

## Live probe

{{applet:apps-package-preview}}
