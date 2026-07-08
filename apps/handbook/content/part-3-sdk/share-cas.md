# Content-addressed share

`share:cas` stores a bounded string and returns a 94-character 256t id.
Paste or scan that id on another device to `share.get` the same bytes —
diagnostics reports and DevStudio hand-offs use this path.

## API

```javascript
import { share } from "@twistedpear/miniapp-sdk";

const { t256, size } = await share.put("hello");
const again = await share.get(t256);
```

## Live probe

{{applet:share-cas}}
