# Workspace

`workspace` is a private per-app project filesystem of relative paths
(strings; 256 KiB/file, 4 MiB and 512 files per app). DevStudio and this
Handbook use it for sources and applet seeds.

## Content-by-reference

Large chapter text and applet sources live in workspace files. Widget trees
reference them via `code-editor` `documentId` — keeping render payloads under
the byte budget.

## API

```javascript
import { workspace } from "@twistedpear/miniapp-sdk";

await workspace.write("src/main.js", source);
const text = await workspace.read("src/main.js");
const files = await workspace.list("src/");
await workspace.remove("src/main.js");
```

Paths are relative; traversal outside the app root is rejected.

## Outcomes

- `pass` — write/read/list/remove succeeded.
- `not-granted` — `workspace` withheld.

## Live probe

{{applet:workspace-rw}}

Packaging reads workspace projects — [Packaging & preview](chapter:sdk-apps-package).
