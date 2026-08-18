# 4. Joining a network

<!-- tp-doc
lifecycle: live
audited: 2026-08-18
register: none
-->

A host with no peers is a very quiet program. This chapter gets you connected to
somebody.

The host reaches other people through **interfaces** — one per kind of link. You can have
several running at once, and the host uses whichever is available. Turning them on and
off is done in **Settings → Interfaces**.

![The interfaces settings panel](/guide/images/04-interfaces-settings.png)

**Screenshot 4.1 — Settings → Interfaces.** A settings panel listing each interface as a
row with a toggle and a status pill: "Local network (AutoInterface) — _on, 2 peers_",
"TCP client — _off_", "WebSocket gateway — _off_", "Bluetooth — _off_", "LoRa radio
(RNode) — _no device_". The TCP row is expanded, showing host and port fields.

## The fastest path: someone else's node

If a friend, hackerspace, or community already runs a TwistedPear or Reticulum node, ask
them for its address and port. Turn on **TCP client**, enter it, and you are on their
network — including everyone else connected to it.

![The TCP client interface configured and connected](/guide/images/04-tcp-connected.png)

**Screenshot 4.2 — A connected TCP interface.** Settings → Relay & Interfaces with TCP
and Auto online. Each row follows the live host format: kind, online/offline, direction,
bitrate, and byte counters.

To start without operating a node, choose **Join community network**. The host tries the
bundled, redundant profile of community-operated Reticulum TCP transports. Joining is
opt-in: the operator can observe your IP address and traffic timing, availability is not
guaranteed, and TwistedPear does not treat the operator as a package or identity trust root.
See [Community network bootstrap](../docs/community-network.md).

## On the same Wi-Fi: automatic discovery

**Local network discovery** is on by default. Two hosts on the same Wi-Fi or wired
network find each other without any configuration, usually within a few seconds.

![Two peers discovered on the local network](/guide/images/04-local-discovery.png)

**Screenshot 4.3 — Automatic local discovery.** The _Announce browser_ showing two
entries that appeared without configuration, each with a short address, a "local
network" badge, and a timestamp like "seen 3s ago".

> **⚠️ Works, with limits — not verified on real networks.** Local discovery is exercised
> continuously in automated tests and containers, but the full multi-machine
> Wi-Fi case (two desktops plus a phone on one real LAN) has not been run on hardware.
> Tracked as **H18**; on iPhones the same feature additionally needs the Apple multicast
> entitlement, tracked as **H12** and **H15**. See
> [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).

## Browser: connecting through a gateway

A browser tab cannot discover anything or accept connections. It always dials one
**gateway** — a desktop or headless node that has `--ws-listen` turned on. If you opened
the web host from your own node's address, the gateway is already configured and you have
nothing to do.

![The web host connected to a gateway](/guide/images/04-web-gateway.png)

**Screenshot 4.4 — Web host gateway connection.** Browser tab showing a single interface
row, "WebSocket → wss://…:9474", with a green connected pill, and explanatory text noting
that the browser is a leaf peer.

## Without any internet: Bluetooth

Two phones can talk directly over Bluetooth with no Wi-Fi, no router, and no internet.
Turn on **Bluetooth** on both, and they find each other when in range.

![Two phones linked over Bluetooth](/guide/images/04-ble-link.png)

**Screenshot 4.5 — A Bluetooth link between two phones.** Two phone screenshots side by
side, each showing the Bluetooth interface row as connected and the other device present
in the _Announce browser_. Include the signal-strength or throughput readout if the UI
shows one.

Bluetooth is slow — good for messages, workable for tiny apps, painful for anything
large. Expect a small app to take seconds and a megabyte-sized one to take minutes. The
host warns you before starting a transfer that will be slow.

> **⏳ Not yet available — verified on hardware.** Phone-to-phone Bluetooth is a
> TwistedPear-specific interface, implemented and tested in emulators and simulators but
> never validated between two real phones. Throughput numbers, background behaviour,
> pairing reliability, and iPhone-to-Android visibility are all unmeasured. Tracked as
> **H2**, **H7**, **H9**, and **H14** in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).
> Bluetooth also only connects TwistedPear hosts to each other — no other Reticulum
> software speaks this interface yet. See [LIMITATIONS.md §3](../LIMITATIONS.md).

## Off the grid entirely: LoRa radio

With an **RNode** — a small LoRa radio, connected by USB to a computer or by Bluetooth to
a phone — hosts reach each other over kilometres with no infrastructure at all.

![An RNode radio attached and linked](/guide/images/04-rnode.png)

**Screenshot 4.6 — An RNode LoRa radio in use.** Host window with the RNode interface row
showing the detected device name, frequency, and spreading factor, plus a link indicator.
If possible, a photo inset of the physical radio next to the laptop, to make clear this is
hardware.

LoRa is _very_ slow — around a kilobit per second. Messages work well. App installs do
not: the host blocks automatic large downloads over a LoRa-only link above 64 KiB and
warns above 32 KiB.

> **⏳ Not yet available — verified on hardware.** RNode support is implemented and
> exercised against simulated serial devices, but no real LoRa radio has been used
> end to end. Tracked as **H4**, **H8**, **H16**, and **H19**.

## Reading the announce browser

Whatever interface you use, discovered peers show up in one place: the **announce
browser**. An "announce" is a peer saying _I exist, here is my address_.

![The announce browser with several peers](/guide/images/04-announce-browser.png)

**Screenshot 4.7 — The announce browser.** A list of six entries. Each row: short
address, an optional friendly name, which interface it arrived on, hop count, and last
seen time. One row is expanded showing the full address and a **Copy address** action.

Things worth knowing when reading it:

- **Hops** tells you how many peers a message crosses to reach that address. More hops
  means slower and more fragile, not less secure.
- **Seen** ages out. A peer that has not announced recently may be gone; the host does not
  know the difference between "offline" and "quiet".
- Empty is normal for the first minute. If it stays empty, see
  [Chapter 10 — Troubleshooting](10-troubleshooting.md).

## Next

Find something to run: [Chapter 5 — Finding and installing apps](05-finding-and-installing-apps.md).
