# 10. Apps that use Freenet

<!-- tp-doc
lifecycle: live
audited: 2026-07-29
register: none
-->

Freenet gives a mini-app access to replicated contract state without giving it
a socket, a node token, or direct network access. The accepted integration
model is deliberately narrow: TwistedPear apps are Freenet clients; TwistedPear
does not execute Freenet contracts or web UIs inside the mini-app sandbox.

> **Capabilities:** `freenet:contract`

> **⚠️ Desktop/headless only, with an external node.** Mobile and browser hosts
> do not expose this capability. Freenet is off by default.

> **A write cannot be recalled.** `put` and `update` publish to a global
> replicated network. The host displays its own confirmation for every write.
> An app cannot draw over, pre-approve, or bypass that prompt.

## Contract notebook

[Contract notebook](examples/contract-notebook/README.md) is intentionally a
hex-level tool. It lets you paste a known contract key and read its state, or
supply contract WASM, parameters, and state for a put/update. Keeping the
example low-level avoids pretending that arbitrary contract state has a common
JSON shape.

The read path is the ordinary broker pattern:

```javascript
import { freenet } from "@twistedpear/miniapp-sdk";

const record = await freenet.get(keyHex);
if (record !== null) {
  stateHex = record.stateHex;
}
```

The mini-app sees only a key and state bytes. The host owns the configured node
URL and optional auth token.

Writing looks similarly small in app code:

```javascript
const { keyHex } = await freenet.put({
  wasmHex,
  parametersHex,
  stateHex
});

await freenet.update({ keyHex, codeHashHex, stateHex: nextStateHex });
```

The important behavior is outside the snippet. Both calls pause at host chrome
with a warning that the operation is globally published and irreversible. A
rejected prompt returns an error to the app; it does not queue a write for
later.

## Try the safe half first

1. Follow [Using Freenet](../guide/11-using-freenet.md) to run and configure the
   pinned external node.
2. Pack and side-load the notebook.
3. Grant `freenet:contract`.
4. Paste a contract key you already trust and press **Get**.
5. Confirm that the returned state is hex and that no write prompt appeared.

Only try **Put** or **Update** with a disposable contract and with the explicit
intention to publish. Even a failed or rejected public-network operation may
expose operation metadata to the node or network.

## Failure handling

Treat these as ordinary, recoverable states:

| Failure | App behavior |
|---|---|
| Capability revoked | Keep local edits; disable network actions. |
| Freenet not configured | Show setup instructions; do not retry in a loop. |
| Contract not found | Preserve the entered key so the user can check it. |
| Host confirmation refused | Report “not published”; never imply the write is pending. |
| Node disconnects | Let the user retry explicitly after checking Node status. |

## Make it yours

- Decode one known contract's state into host-rendered fields.
- Make the read view useful while leaving all mutation out.
- Compare a fetched state hash before offering an update.
- Add an application-specific preview of the exact bytes the confirmation will
  publish.

The complete source is
[`cookbook/examples/contract-notebook`](examples/contract-notebook/README.md).
