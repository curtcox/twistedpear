# Packaging & preview

`apps:package` and `apps:preview` are double-gated: the capability grant plus a
host-chrome confirmation the mini-app cannot dismiss. Package signs under the
device publisher identity; preview runs the project in the single sandboxed
dev-preview slot.

## Deterministic packages

`tp pack` and `apps.packageProject` produce deterministic `.tpkg` archives —
same inputs yield the same hash. That makes 256t ids stable for distribution
and CI.

## API

```javascript
import { apps } from "@twistedpear/miniapp-sdk";

const packed = await apps.packageProject("my-app", manifest);
const { launched } = await apps.preview("my-app", manifest, grants);
await apps.stopPreview();
```

Only one preview slot exists per host. Stop preview before starting another.

## Live probe

Use **Run applet** for the automated inline probe (package → preview → stop, used in CI).

Use **Run as real app** to launch the sample in the host dev-preview slot — the full
sandbox/grant/launch loop with host confirmation. Stop preview when finished.

{{applet:apps-package-preview}}

Next: [Publish & install](chapter:sdk-apps-publish). Format reference: [Package format](chapter:ref-packages).
