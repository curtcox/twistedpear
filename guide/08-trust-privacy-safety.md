# 8. Trust, privacy, and safety

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

This chapter is deliberately blunt. A platform with no company in the middle also has no
company to catch things for you, and you should know precisely where that line falls.

## What is protected

**Message contents are encrypted end to end.** Only the recipient's key can read them. A
relay carries bytes it cannot interpret.

**Packets carry no sender address.** A relay cannot tell you who originated the traffic it
is forwarding.

**Apps are cryptographically bound to their author.** A package cannot be modified in
transit without breaking its signature, and an app's key is pinned the first time you see
it — a later impostor is refused, not silently accepted.

**Apps are sandboxed.** A mini-app has no ambient access to your files, your network, your
camera, other apps' data, or the host's own storage. Everything crosses a single
checkpoint where your grants are enforced.

![The sandbox boundary illustrated](/guide/images/08-sandbox-boundary.png)

**Screenshot 8.1 — What an app can and cannot reach.** A diagram, not a UI capture. A
mini-app box sits inside a sandbox ring. One single arrow leaves it, through a gate
labelled "your grants", into the host. Crossed-out arrows point from the app directly at
"files", "network", "camera", and "other apps' data".

## What is not protected

**You are observable locally.** Bluetooth advertises a hardware address. Wi-Fi discovery
broadcasts on your local network. Radios transmit. Somebody physically near you can tell
that a device is running something and roughly when — the encryption protects contents,
not the fact of your presence. Reticulum is not an anonymity network and this guide will
not pretend otherwise.

**Nobody screens apps.** There is no review team, no malware scan, and no takedown. An app
you install can do anything the capabilities you granted allow it to do. Withholding a
capability is the enforcement mechanism, and it is a real one — but the judgement is
yours.

**Your identity file is unencrypted on disk.** Anyone with access to your computer's user
account has your identity. See [Chapter 3](03-first-run-and-identity.md).

**In a browser, whoever serves the page controls everything.** The web host is only as
trustworthy as the origin that served it, because that origin supplies the code that
handles your keys. Serve it from your own node. See
[LIMITATIONS.md §8](../LIMITATIONS.md).

## Deciding whether to install something

The questions worth asking, in order:

1. **Who signed it?** An address you recognise, or a stranger's?
2. **How did you learn about it?** Someone you trust, or an announce from an unknown peer?
3. **What is it asking for, and does that make sense?** A noticeboard app that wants to
   publish and subscribe to announces is coherent. A calculator that wants to send
   messages is not.
4. **Can you say no to part of it?** If a capability looks unnecessary, withhold it and
   see whether the app still does what you wanted.

![An install from an untrusted publisher](/guide/images/08-untrusted-publisher.png)

**Screenshot 8.2 — Installing from a publisher you have not trusted.** The capability
review modal in its untrusted variant: an amber banner reading "You have not trusted this
publisher" with the full publisher address, above the normal capability list. The
**Install** button is present but visually secondary to **Cancel**.

## Things a well-behaved host will never do

Knowing what is *not* normal is a useful defence:

- The host never asks for a password, a recovery phrase, or a payment method. It has none
  of those concepts.
- An app can never show you a system-looking permission prompt. Confirmation dialogs are
  drawn by the host, outside the app's surface — that is why the visual separation in
  [Chapter 6](06-using-apps.md) matters.
- Updates never install themselves, and a new version that wants new capabilities always
  asks again.

## The security work that has been done

The broker checkpoint — the single place every app request crosses — has had an
adversarial review, with deliberately hostile test apps run against it in automated tests.
Two real problems found in that review (a capability substitution and a forged UI event)
were fixed. The written review is
[docs/security-review.md](../docs/security-review.md).

> **⚠️ Works, with limits — sandbox parity on real phones is unverified.** The hostile-app
> test suite passes on desktop and in emulators. The same suite has not been run on real
> Android hardware, where the sandbox uses a different underlying mechanism. Tracked as
> **H11** in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).

> **⚠️ Works, with limits — the browser sandbox is a different mechanism.** In a browser,
> app isolation rests on the browser's own sandboxing rather than on operating-system
> processes. It passes the same adversarial tests, but it is a weaker boundary in
> principle. See [LIMITATIONS.md §8](../LIMITATIONS.md).

## If you are relying on this for something serious

Be honest with yourself about the current state. TwistedPear v1 has not shipped, no
version has been through an external security audit, and several of the protections above
have been verified in software but not on the hardware you would actually use. If your
safety depends on the tool, wait for the release and the audit, or use something with a
longer track record.

## Next

Keep your device healthy: [Chapter 9 — Managing your device](09-managing-your-device.md).
