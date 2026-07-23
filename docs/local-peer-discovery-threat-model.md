# Local peer discovery threat model

<!-- tp-doc
lifecycle: reference
audited: 2026-07-23
register: none
-->

The security boundary is the host. Mini-apps receive an app/runtime-scoped opaque handle;
they never receive invitation bytes, radio access, addresses, SDP, ICE, relay credentials,
or permission APIs. Discovery proposes a peer, authentication confirms it, and a data-plane
adapter opens the route. None of those steps implies either of the others.

| Threat | Enforced control |
|---|---|
| Tracking and stable identifiers | Invitations use fresh session and ephemeral-key material; display text is untrusted. |
| Malicious QR/audio/manual input | Canonical decoder rejects unknown CBOR types, duplicate keys, trailing data, deep nesting, invalid UTF-8, over-budget fields, and over-budget envelopes before effects run. |
| Cross-app confusion | The broker derives `service` from the signed app id and rejects cross-app names. Handles are checked against app and runtime on every operation. |
| Replay | Invitations are short-lived and single-use; adapters/session drivers must pass replay status into the pure pairing machine before confirmation. |
| ntfy guessing and caching | Topics require 128 bits of entropy and payload encryption independent of TLS. Topic knowledge is never identity proof. |
| Downgrade | The registry selects one user-visible mechanism; authenticated capabilities and selected data plane are part of confirmation. |
| Confirmation spoofing | Pairing drivers are host-owned. The SDK exposes only a confirmation-bound promise and app widgets cannot acknowledge host chrome. |
| Resource exhaustion | Envelope, fields, candidates, capability count, timeouts, active handles, and decoder depth are bounded. Cancellation closes adapter and route state. |

Permission prompts may only follow an explicit action in trusted host chrome. Adapter
`availability()` is side-effect-free and reports permission-required separately from
unsupported, offline, and policy-disabled.
