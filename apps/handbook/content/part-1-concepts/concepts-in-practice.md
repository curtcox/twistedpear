# Concepts in practice

The applets below run on **this** host — the same probes used in Part III and
Part IV diagnostics, grouped for readers who want to see Reticulum building
blocks work before diving into SDK chapters.

If the Handbook installed and these applets pass, you have verified identity
derivation, announce loopback, and LXMF self-delivery on your current host.

## Identity

Derives the app destination hash from the host identity. No private keys in the
sandbox.

{{applet:identity-hash}}

## Announce loop

Publishes then subscribes in a local namespace — the discovery primitive apps use
before install.

{{applet:announce-loop}}

## LXMF self-message

Sends and receives a message to this app’s own destination — store-and-forward on
Reticulum.

{{applet:lxmf-roundtrip}}

Next: [Identity & signing](chapter:sdk-identity) · [Running diagnostics](chapter:running-diagnostics)
