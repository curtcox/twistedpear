# Workspace

`workspace` is a private per-app project filesystem of relative paths
(strings; 256 KiB/file, 4 MiB and 512 files per app). DevStudio and this
Handbook use it for sources and applet seeds.

## API

```javascript
import { workspace } from "@twistedpear/miniapp-sdk";

await workspace.write("src/main.js", source);
const text = await workspace.read("src/main.js");
const files = await workspace.list("src/");
await workspace.remove("src/main.js");
```

## Live probe

{{applet:workspace-rw}}
