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

Use **Run applet** for the automated inline probe (package → preview → stop, used in CI).

Use **Run as real app** to launch the sample in the host dev-preview slot — the full
sandbox/grant/launch loop with host confirmation. Stop preview when finished.

{{applet:apps-package-preview}}
