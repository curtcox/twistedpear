# Workspace

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

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
await workspace.patch("src/main.js", text.length, [
  { start: 0, end: 0, text: "// edited\n" },
]);
const files = await workspace.list("src/");
await workspace.remove("src/main.js");
```

Paths are relative; traversal outside the app root is rejected. Patch offsets are UTF-16
string indexes. Edits must be ordered and non-overlapping; a stale base length is rejected.

## Outcomes

- `pass` — write/read/list/remove succeeded.
- `not-granted` — `workspace` withheld.

## Live probe

{{applet:workspace-rw}}

Packaging reads workspace projects — [Packaging & preview](chapter:sdk-apps-package).
