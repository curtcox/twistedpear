# Presence


<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

`presence` exposes coarse peer and interface state: how many peers are visible, which
interface is preferred, and whether the host considers itself online. It complements
`host.info()` for the [live difference matrix](chapter:difference-matrix).

## What presence is not

Presence is not a full routing table. It is a snapshot for UI and diagnostics — enough
to tell whether BLE, TCP, or WebSocket paths look healthy on **this** host.

## API

```javascript
import { presence } from "@twistedpear/miniapp-sdk";

const snap = await presence.snapshot();
// { peers, preferredInterface, ... }
```

Grant `presence` at install. Without it, host info and presence probes become
`not-granted` teaching cards.

## Reading results

- `peers === 0` on a phone may be normal in CI; on LAN with a second peer it often
  indicates discovery still warming up.
- Compare with `host.info().interfaceTypes` — an interface can be listed but offline.

## Live probe

{{applet:presence-snapshot}}

See also the [live difference matrix](chapter:difference-matrix) (`host.info` applet).
