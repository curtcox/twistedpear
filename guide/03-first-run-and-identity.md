# 3. First run and your identity

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

The first time a host starts it generates a keypair and saves it. That keypair is your
identity on the network. This chapter is short, and it is the most important chapter in
the guide.

## What happens on first launch

![First-launch screen with the Create identity button](/guide/images/03-create-identity.png)

**Screenshot 3.1 — First launch, before an identity exists.** Host window with the
_Node status_ panel showing "Identity: none" and "Persisted: no". A single prominent
**Create identity** button sits below. Everything else on screen is dimmed or empty,
making it obvious this is the one action available.

Enter and confirm a passphrase of at least 12 characters, then press **Unlock / create**.
The host generates an Ed25519/X25519 keypair, encrypts it at rest, and derives your address.

![Node status after identity creation](/guide/images/03-identity-created.png)

**Screenshot 3.2 — After creating an identity.** The same panel now reads
"Identity: `a3f4…9c21`", "Persisted: yes", and shows a **Show my identity** button. The
address is displayed in a monospace font, clearly selectable.

## Your address

Your address is the hex fingerprint shown in the status panel. It is what other people
use to reach you. It is not secret — publish it, print it, put it in your email
signature.

![The Show my identity panel with a QR code](/guide/images/03-show-my-identity.png)

**Screenshot 3.3 — Sharing your address.** A modal or panel titled "Show my identity"
containing a large QR code, the full hex address below it in monospace, and a **Copy**
button. This is the shot people will screenshot and send to each other, so it must be
legible at phone size.

On phones and desktop you can scan someone else's QR code with the camera to add them.
Pasting the string remains available everywhere.

> **⚠️ Works, with limits — desktop scanning is host-owned.** The desktop host uses
> Chromium's `BarcodeDetector` and requests camera access only from host chrome. If either
> is unavailable, paste the 256t string instead. See
> [LIMITATIONS.md §7](../LIMITATIONS.md).

## Back up your identity now

There is no password reset. There is no support address. If you lose your identity file,
you lose your address, your message history's continuity, and any apps published under
it — permanently and with no recourse. Nobody, including the people who wrote
TwistedPear, can restore it.

In desktop **Settings → Identity backup**, choose **Export encrypted backup** to save a
`.tpidentity` file, or **Show recovery words** to reveal the two labelled 24-word groups.
The CLI provides the same operations with `tp identity export` and
`tp identity recovery show`. Anyone with either complete backup representation is you.

The encrypted vault and exported backup use the portable format described in
[Identity backup and recovery](../docs/identity-backup.md). Legacy raw identity files are
migrated without changing the identity hash after you set a passphrase.

![Identity backup settings with both recovery-word groups revealed](/guide/images/03-recovery-words.png)

**Screenshot 3.4 — Recovery words.** The desktop host's real Identity backup panel after
the explicit reveal action. Both labelled 24-word groups are required; the documentation
identity shown here is disposable.

Default identity locations are:

| Platform      | Data directory                                               |
| ------------- | ------------------------------------------------------------ |
| macOS         | `~/Library/Application Support/TwistedPear/host`             |
| Linux         | `~/.local/share/twistedpear/host`                            |
| Windows       | `%APPDATA%/TwistedPear/host`                                 |
| Android / iOS | Private app storage — not reachable without a device backup  |
| Browser       | Stored in the browser's own database — see the warning below |

Store the `.tpidentity` file and its passphrase separately, or record both recovery-word
groups offline. Restore with desktop **Import backup** / **Recover from words**, or with
`tp identity import` / `tp identity recovery import`.

> **⚠️ Works, with limits — phone and browser identities cannot yet be exported in-host.** On Android
> and iOS the identity lives in private app storage; clearing the app's data destroys it.
> In a browser it lives in IndexedDB and your browser can evict it — clearing site data
> destroys it. If either identity matters to you, keep the desktop host as your primary
> and treat the phone or tab as secondary. See [LIMITATIONS.md §8](../LIMITATIONS.md).

## Resetting

**Reset identity** discards your keypair and generates a new one. You become a different
person on the network: your old address stops working and nobody who saved it can reach
you. The host asks for confirmation, and the confirmation is worth reading.

![The reset identity confirmation](/guide/images/03-reset-confirmation.png)

**Screenshot 3.5 — Reset confirmation dialog.** A modal with the heading "Reset
identity?", body text stating that the current address will be unreachable forever and
that installed apps' data will be orphaned, a greyed-out **Reset** button that becomes
active only after the checkbox "I have a backup or do not need this identity" is ticked,
and a **Cancel** button that is the default focus.

## One identity per device, by default

Each host generates its own identity. Your laptop and your phone are two different peers
with two different addresses, and that is the normal, intended arrangement — it means
losing your phone does not compromise your laptop.

> **⏳ Not yet available — linked devices.** There is no way to link two hosts into one
> logical identity, sync messages between your own devices, or move an identity between
> platforms through the UI. Copying the identity file to a second desktop works but is
> not a supported configuration and will produce confusing announce behaviour.

## Next

Get your host onto a network where there is somebody to talk to:
[Chapter 4 — Joining a network](04-joining-a-network.md).
