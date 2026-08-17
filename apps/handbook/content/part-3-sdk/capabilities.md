# Capability model

<!-- tp-doc
lifecycle: live
audited: 2026-07-10
register: none
-->

Mini-apps declare every SDK surface they may use in `app.manifest.json`. At
install the host shows the full list; the user may grant a **subset**. The
broker enforces grants on every call — withheld capabilities are not errors in
the Handbook, they become `not-granted` teaching cards.

## Manifest

```json
{
  "capabilities": ["identity", "storage:kv", "workspace"]
}
```

Only ids from `CAPABILITY_DEFINITIONS` are valid. The reference list is
generated at build time: [Capabilities](chapter:ref-capabilities).

## Typed errors

The runtime throws `CapabilityError` with a stable `code`:

| Code                    | Meaning                                                 |
| ----------------------- | ------------------------------------------------------- |
| `UNKNOWN_CAPABILITY`    | Manifest names a capability the host does not recognize |
| `UNDECLARED_CAPABILITY` | Code calls a capability not listed in the manifest      |
| `CAPABILITY_DENIED`     | Manifest lists it but the user withheld the grant       |

```javascript
import { identity } from "@twistedpear/miniapp-sdk";

try {
  await identity.destinationHash();
} catch (error) {
  if (error?.code === "CAPABILITY_DENIED") {
    // Explain what identity would allow; offer to open Settings
  }
}
```

## Live probe

Withhold `identity` at install (or tap **Revoke** in host settings) and re-run
the applet — it reports `not-granted` instead of throwing into your UI.

{{applet:identity-hash}}

Double-gated capabilities (`apps:package`, `apps:publish`, `apps:install`,
`apps:preview`) also require a host-chrome confirmation the sandbox cannot
dismiss. See [Packaging & preview](chapter:sdk-apps-package).

`peer:connect` is confirmation-bound as well. Peer handles are opaque and scoped to the
calling app runtime; this safe probe passes only when a fabricated handle is rejected and
never starts discovery or prompts for camera, microphone, Bluetooth, or network access.

{{applet:peer-handle-isolation}}

`freenet:contract` reads and writes contract state through an explicitly configured
external Freenet node. Reads do not prompt. `put` and `update` require trusted host
confirmation because accepted updates cannot be recalled. The read-only probe below
uses a deliberately unknown key and never publishes data.

{{applet:freenet-contract-read}}

`apps:channel` is a brokered channel between two running mini-apps. Opening it
raises a host confirmation that names the destination; both apps must grant the
pair separately. Shared storage is not included. The probe below asks for a
channel to an app that is not running and expects `CHANNEL_PEER_NOT_RUNNING`
before any confirmation.

{{applet:apps-channel-isolation}}
