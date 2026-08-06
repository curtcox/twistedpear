# 1. What TwistedPear is

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

TwistedPear is a way to run small applications, and talk to other people, without
a company in the middle. There is no account to create, no server to sign in to,
and nothing that stops working if a business shuts down.

## The two things you need to know

**A host** is the TwistedPear program on your device. You install one host per device —
desktop, phone, or browser tab. The host is your peer on the network: it holds your
identity, talks to other people's hosts, and runs your apps.

**A mini-app** is a small application that runs _inside_ your host. Chat, file sharing,
a shared noticeboard, the Handbook. Mini-apps cannot touch your device directly. They
ask the host for everything they need, and the host asks you.

![Diagram of a host running three mini-apps and connecting to two peers](/guide/images/01-mental-model.png)

**Screenshot 1.1 — The mental model.** A clean diagram, not a UI capture. Centre: a
rounded box labelled "Your host" containing three smaller boxes labelled "Chat",
"File drop", and "Handbook". Arrows leave the host box to two other host boxes labelled
"Ana's phone" and "Community desktop node". A dashed line separates the mini-app boxes
from the host box, labelled "everything crosses here".

## There is no server

When you send someone a message, it goes from your device toward theirs across whatever
links exist between you: home Wi-Fi, a friend's always-on computer, a Bluetooth hop, a
long-range radio. Every host is both a client and, potentially, a relay for other people.

This has two consequences worth internalising before you start.

**Good:** nobody can read your messages in transit, nobody can delete your apps, and the
network keeps working when the internet does not.

**Less good:** the network is only as useful as the peers near you. A brand-new host with
no peers configured does nothing interesting. [Chapter 4](04-joining-a-network.md) is
therefore the chapter that decides whether TwistedPear feels alive or dead to you.

## Your identity is a key, not an account

The first time your host starts, it generates a cryptographic keypair. That keypair _is_
your identity. It is not registered anywhere. Nobody issued it to you and nobody can
revoke it.

Other people find you by your **address** — a short fingerprint derived from that key,
shown in your host as a string of hex characters. You share it the way you would share a
phone number.

Because there is no account recovery, backing up your identity is the single most
important thing you will do in [Chapter 3](03-first-run-and-identity.md).

## Apps are signed by people, not approved by a store

There is no app store, and no review team. A mini-app is a signed bundle; the signature
belongs to a person's identity — the same kind of identity you have. When you install an
app you are making a judgement about its author, not trusting a gatekeeper.

To make that judgement survivable, the host does two things:

1. **It shows you the app's requested capabilities before installing**, and lets you
   withhold any of them. See [Chapter 5](05-finding-and-installing-apps.md).
2. **It runs every app in a sandbox** with no ambient access to your files, your network,
   or other apps' data.

The consequence is stated plainly rather than hidden: nobody is screening apps for you.
See [Chapter 8](08-trust-privacy-safety.md).

## What TwistedPear is not

- **Not anonymous.** Message _contents_ are encrypted end to end, but someone physically
  near you can observe that your device is transmitting. See
  [Chapter 8](08-trust-privacy-safety.md).
- **Not a replacement for native apps.** Mini-apps cannot use the camera arbitrarily, run
  in the background, or ship native code. Whole categories of app do not fit.
- **Not fast over radio.** Over Bluetooth or LoRa, installing an app is measured in
  seconds to minutes and messages are small. Over Wi-Fi it feels normal.

## Next

Install a host: [Chapter 2 — Installing a host](02-installing-a-host.md).
