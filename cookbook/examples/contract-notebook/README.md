# Contract notebook

<!-- tp-doc
lifecycle: reference
audited: 2026-07-29
register: none
-->

A deliberately low-level mini-app showing all three brokered
`freenet:contract` operations: `get`, `put`, and `update`.

Recipe: [10. Apps that use Freenet](../../10-apps-that-use-freenet.md).

## What it shows

- `freenet.get(keyHex)` reads through the configured external node.
- `freenet.put(...)` and `freenet.update(...)` stop at host chrome for a
  per-operation confirmation.
- Contract keys, WASM, parameters, code hashes, and state cross the broker as
  even-length hex strings; the mini-app never receives a WebSocket or auth
  token.

This is an integration notebook, not a friendly end-user app. Use a contract
whose encoding and update rules you understand.

## Capabilities

| Capability | Note |
|---|---|
| `freenet:contract` | Desktop/headless with an external node only. Reads contract state; every put/update asks again because publication is global and irreversible. |

## Run it

Configure Freenet in the desktop host, then:

```sh
tp pack cookbook/examples/contract-notebook
tp dev install contract-notebook-1.0.0.tpkg
```

Or paste `bundle.js` and the manifest into DevStudio. The minimum host API is
0.11.0.
