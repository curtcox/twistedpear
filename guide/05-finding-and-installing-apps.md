# 5. Finding and installing apps

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

There is no app store. Apps reach you in one of two ways: you see one announced by a peer
you are connected to, or somebody sends you a link to one.

## The catalog

The **catalog** is the list of apps your host currently knows about. It fills up as peers
announce the apps they publish.

![The catalog with several available apps](/guide/images/05-catalog.png)

**Screenshot 5.1 — The app catalog.** A list of app cards. Each card: app name, version,
publisher's short address, size, and an **Install** button. Two cards show a "trusted
publisher" badge. A **Refresh catalog** button sits at the top right. One card is
already installed and shows **Launch**, **Rollback**, and **Delete** instead.

Press **Refresh catalog** if it looks stale. If it is empty, the problem is upstream —
you have no peers yet, so go back to [Chapter 4](04-joining-a-network.md).

> **⏳ Not yet available — search and discovery.** There is no directory, no search, no
> categories, no ratings, and no way to browse apps published by people you have not
> connected to. Your catalog contains exactly what your peers have announced to you.
> This is a consequence of having no central registry, not a missing screen — see
> [LIMITATIONS.md §7](../LIMITATIONS.md).

## Installing from a link somebody sent you

Apps are also shared as a single 94-character string called a **256t identifier**. It
looks like a long jumble of letters and numbers, and it fits in a chat message, an email,
or a QR code.

Paste it into **Catalog → Install from identifier**, or scan the QR code with your
phone's camera.

![Installing from a pasted 256t identifier](/guide/images/05-install-from-256t.png)

**Screenshot 5.2 — Install from an identifier.** A dialog with a wide monospace text
field containing a 94-character string, a **Scan QR** button beside it (greyed out on
desktop), and a **Resolve** button. Below, a resolved preview showing the app name,
version, publisher, and size before anything is installed.

The identifier is a fingerprint of the app's contents, not a location. Whoever you got it
from cannot use it to give you a different app than the one it names — if the bytes do not
match, your host refuses the install.

> **⚠️ Works, with limits — the app must already have been announced.** Your host can only
> resolve an identifier if it has already heard an announce telling it where those bytes
> live. If you paste an identifier for an app nobody near you has announced, it will not
> resolve, and the host cannot go and ask for it. Wait until you are connected to a peer
> that carries it. See [LIMITATIONS.md §7](../LIMITATIONS.md).

## The capability review

This is the screen that matters. Before anything is installed, the host shows you exactly
what the app is asking for, and lets you refuse any of it.

![The capability review screen](/guide/images/05-capability-review.png)

**Screenshot 5.3 — Capability review before install.** A modal headed "Install Chat?"
with the publisher's address and trust status at the top. Below, a list of requested
capabilities, each with a plain-language description and its own toggle, all defaulting
to granted: "Send messages", "Receive messages", "Store local data", "Read peer
presence". One capability, "Publish an address other people can see", is shown toggled
off by the user, with a note reading "The app will work with reduced functionality."
Bottom: **Install** and **Cancel**.

Every capability is deny-by-default in the sense that matters: the app gets nothing it did
not ask for and you did not approve. Common ones, in plain terms:

| The app asks to… | What that actually allows |
|---|---|
| Send messages | Send messages *from the app's own address*, not from yours. |
| Receive messages | Receive messages addressed to the app. |
| Store local data | Keep data on your device, in a private area only this app can see. |
| Read presence | See which peers and interfaces are around, coarsely. |
| Publish an address | Announce itself on the network so others can find it. |
| Fetch resources | Download data, subject to your bandwidth limits. |
| Install other apps | Ask *you* to install something — it asks again every time. |

Two things it can never ask for: direct access to your files, and direct access to the
network. Those do not exist as capabilities. Everything goes through the host.

You can change your mind later in **Grants** — see [Chapter 6](06-using-apps.md).

## Trusting a publisher

Apps are signed. The signature identifies the author by the same kind of address you
have. **Trusted publishers** is your personal list of authors whose apps you have decided
you are willing to install.

![The trusted publishers panel](/guide/images/05-trusted-publishers.png)

**Screenshot 5.4 — Trusted publishers.** A panel listing three publishers, each with a
friendly label the user chose, the publisher's address in monospace, and a **Remove**
action. Below, a **Trust publisher** form with a paste field and a label field, and a
**Show my identity** button for sharing your own publisher address.

Trusting a publisher does not skip the capability review — it only tells the host you
recognise the author. Untrusted publishers can still be installed from, with a clearer
warning.

Separately, and automatically, the host pins the key it first saw for each app. If an app
called "Chat" later arrives signed by a *different* key, the install is refused rather
than silently accepted. This protects you even for publishers you never explicitly
trusted.

## What a slow install looks like

Over Wi-Fi, installs are instant. Over Bluetooth or LoRa they are not, and the host tells
you before it starts rather than appearing to hang.

![A transfer warning before a slow install](/guide/images/05-slow-install-warning.png)

**Screenshot 5.5 — Slow-link install warning.** A dialog reading something like "This
download is 340 KiB. Over your current Bluetooth link that will take about 2 minutes.
Continue?" with **Continue** and **Cancel**, and a smaller line naming the interface it
would use.

Over a LoRa-only link, downloads above 64 KiB are refused outright rather than warned
about. That is deliberate: a transfer that would take an hour and block the radio is
worse than a clear refusal.

## Next

Run what you installed: [Chapter 6 — Using apps](06-using-apps.md).
