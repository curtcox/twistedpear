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
*Node status* panel showing "Identity: none" and "Persisted: no". A single prominent
**Create identity** button sits below. Everything else on screen is dimmed or empty,
making it obvious this is the one action available.

Press **Create identity**. The host generates an Ed25519/X25519 keypair, writes it to
disk, and derives your address from it. This takes well under a second.

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

On phones you can scan someone else's QR code with the camera to add them. On desktop,
QR codes are displayed but not scanned — paste the hex string instead.

> **⚠️ Works, with limits — QR scanning is mobile-only.** The desktop host renders QR
> codes but accepts pasted addresses only; camera scanning is a mobile-host feature. See
> [LIMITATIONS.md §7](../LIMITATIONS.md).

## Back up your identity now

There is no password reset. There is no support address. If you lose your identity file,
you lose your address, your message history's continuity, and any apps published under
it — permanently and with no recourse. Nobody, including the people who wrote
TwistedPear, can restore it.

> **⏳ Not yet available — guided backup.** There is no export-to-recovery-phrase flow, no
> "back up my identity" button, and no passphrase protection. Backing up today means
> copying a file yourself, and that file is an unencrypted private key. Treat it exactly
> as you would treat a house key. Tracked in
> [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md).

Copy the file called `identity` from your host's data directory:

| Platform | Data directory |
|---|---|
| macOS | `~/Library/Application Support/TwistedPear/host` |
| Linux | `~/.local/share/twistedpear/host` |
| Windows | `%APPDATA%/TwistedPear/host` |
| Android / iOS | Private app storage — not reachable without a device backup |
| Browser | Stored in the browser's own database — see the warning below |

Put the copy somewhere encrypted: a password manager's secure file store, an encrypted
disk image, or a hardware backup. To restore, stop the host, put the file back at the
same path, and start it again.

> **⚠️ Works, with limits — phone and browser identities cannot be exported.** On Android
> and iOS the identity lives in private app storage; clearing the app's data destroys it.
> In a browser it lives in IndexedDB and your browser can evict it — clearing site data
> destroys it. If either identity matters to you, keep the desktop host as your primary
> and treat the phone or tab as secondary. See [LIMITATIONS.md §8](../LIMITATIONS.md).

## Resetting

**Reset identity** discards your keypair and generates a new one. You become a different
person on the network: your old address stops working and nobody who saved it can reach
you. The host asks for confirmation, and the confirmation is worth reading.

![The reset identity confirmation](/guide/images/03-reset-confirmation.png)

**Screenshot 3.4 — Reset confirmation dialog.** A modal with the heading "Reset
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
