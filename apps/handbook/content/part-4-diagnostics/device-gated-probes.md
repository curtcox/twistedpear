# Device-gated probes

These applets need **real hardware or a guided manual step** on a phone. In CI and
simulators they report `unavailable` with the procedure below — that is expected, not
a failure.

When you complete a procedure on real hardware, register the run in the repo’s
`STATUS-HARDWARE.md` (Handbook rows H21–H22).

## Before you start

- Use two peers on the same LAN for BLE and AutoInterface probes when possible.
- Keep the host app in the **foreground** during discovery windows.
- Export a diagnostic report on each device and use **Compare report** to diff results.

## BLE peer

Requires two phones with BLE enabled and the BLE interface turned on in host settings.
Expect `unavailable` in simulators; on hardware you should see at least one peer in
presence before the applet reports `pass`.

{{applet:ble-peer}}

## RNode serial / LoRa

Connect an RNode per the host interface docs. Enable the RNode interface, then run the
probe. Desktop and Android support USB serial; iOS uses BLE to the RNode.

{{applet:rnode-serial}}

## Multicast / AutoInterface

Two LAN peers with AutoInterface or Bonjour discovery enabled. iOS may need the
multicast entitlement — see [Known limitations](chapter:ref-limitations) §4.

{{applet:multicast-auto}}

## Camera QR scan

Point the device camera at a Handbook diagnostic report QR or any valid 256t id QR
generated on another screen. Simulators lack a camera path and report `unavailable`.

{{applet:camera-qr-scan}}

After hardware runs, compare reports: [Running diagnostics](chapter:running-diagnostics).
