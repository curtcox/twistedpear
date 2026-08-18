# Local blocking, muting, and reports

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

TwistedPear has no central moderation authority. Safety controls are local policy:

- **Block** rejects a validated LXMF message before the application receive callback.
- **Mute** delivers the message to history with `notify: false`.
- **Report** stores a timestamped local record. Export produces
  `twistedpear-local-reports-v1` JSON that a user can choose to share with a community
  administrator; exporting does not transmit it.

Block wins if a source appears in both lists. Entries use the authenticated 16-byte LXMF
source destination hash, rendered as 32 lowercase hexadecimal characters, **or** an app
id (`blockedApps`) so a hostile mini-app can be blocked without blocking every message
from the same person. The router applies the same policy after signature validation for
opportunistic, direct-link, and propagated deliveries.

Node hosts persist `moderation.json` atomically with mode `0600`. The desktop worklet uses its
private key-value store, and its **Safety** settings panel manages both lists and local reports.
There is no network report endpoint, takedown, account ban, or promise that another peer will
honour your list.
