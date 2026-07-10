# Announce & subscribe

Announces are signed advertisements that a destination is reachable. Subscribe lets a
mini-app observe announces in a namespace — useful for discovery without polling links.

## Control-plane role

Announces are part of the Reticulum **control plane**. They do not carry bulk data;
they tell peers *where* to open a link or which 256t id to fetch.

## Capabilities

- `announce:publish` — publish this app’s destination.
- `announce:subscribe` — receive matching announces.

Both are required for the loopback probe below.

## API

```javascript
import { announce } from "@twistedpear/miniapp-sdk";

await announce.publish({ namespace: "my-app" });
const stream = await announce.subscribe({ namespace: "my-app" });
```

Namespaces are app-scoped. Publishing without subscribe (or vice versa) limits what
probes can demonstrate.

## Live probe

{{applet:announce-loop}}

Concept background: [Reticulum fundamentals](chapter:reticulum-fundamentals).
Distribution uses announces for app discovery — [Publish & install](chapter:sdk-apps-publish).
