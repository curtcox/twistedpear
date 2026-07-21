# Glossary

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

**256t identifier** — A 94-character string that names a specific piece of content, such
as a mini-app or a publisher's key. It is a fingerprint, not an address: if the bytes you
receive do not match it, your host refuses them.

**Address** — The short hex fingerprint that identifies you (or an app, or a node) on the
network. Derived from your identity key. Not secret.

**Announce** — A peer saying "I exist, here is my address". How discovery works. Shown in
the announce browser.

**Bulk plane** — The fast path used to move large things like app packages when ordinary
internet connectivity is available. Falls back to the slower control plane when it is not.

**Capability** — A specific thing a mini-app is allowed to ask the host to do, such as
sending a message or storing data. You grant them individually at install and can revoke
them later.

**Catalog** — The list of apps your host currently knows about, built from what your peers
have announced.

**Control plane** — The always-available path: identity, announces, links, and messages.
Works over any interface including radio.

**Foreground service** — The Android mechanism that lets the host keep running with the
screen off. Requires the permanent notification you see in the shade.

**Gateway** — A node that a browser host connects through, because browsers cannot join the
network directly.

**Grant** — A capability you have approved for a specific app.

**Host** — The TwistedPear program on your device. One per device. Your peer on the
network.

**Identity** — Your cryptographic keypair. It is not an account; nobody issued it and
nobody can restore it.

**Interface** — One kind of link the host can use: local network, TCP, WebSocket,
Bluetooth, or LoRa radio. Several can run at once.

**Leaf** — A peer that uses the network but does not relay for others. All browser hosts
are leaves; phones are leaves by default.

**Link** — An established, encrypted connection between two peers.

**LoRa / RNode** — Long-range low-power radio, and the small device that provides it.
Kilometres of range at hundreds of bits per second.

**LXMF** — The messaging layer. What Chat is built on.

**Mini-app** — A small sandboxed application that runs inside your host and can only reach
the outside world through capabilities you granted.

**Peer** — Any other host on the network.

**Propagation server** — A host that holds messages for peers who are offline, and hands
them over when they return. Off by default.

**Publisher** — The identity that signed a mini-app. Publisher identity is the same kind of
identity you have.

**Reticulum** — The networking stack underneath TwistedPear. It provides encryption,
addressing, and routing across any mix of links.

**Roles** — What your host does for other people: relaying traffic (transport node),
serving app downloads (seeder), and holding messages (propagation server).

**Seeder** — A host that keeps copies of app packages so nearby peers can install them
quickly.

**Transport node** — A host that forwards other peers' traffic. On by default on desktop,
off on phones.

**Trusted publisher** — An author you have explicitly added to your own trust list.
Trusting does not skip the capability review.

**Widget** — The building block of a mini-app's interface. Apps describe what they want
shown; the host draws it. This is why an app cannot fake a system prompt.

**Worklet** — The isolated process inside the host that runs the networking stack. When
the status panel says "worklet: ready", the engine is running.
