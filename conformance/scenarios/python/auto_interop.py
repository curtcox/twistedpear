#!/usr/bin/env python3
"""Python RNS AutoInterface interop peer for M3 scenarios.

Registers echo, link, and LXMF delivery destinations on one AutoInterface node so
TypeScript can exercise the full interop matrix over LAN discovery.
"""

from __future__ import annotations

import time
from pathlib import Path

import LXMF
import RNS

from load_identity import load_identity
from send_packet import send_packet

CONFIG_DIR = Path(__file__).resolve().parents[1] / "config" / "auto-interop"
APP_NAME = "example"
ECHO_ASPECT = "echo"
LINK_ASPECT = "link"
GREETING = b"hello from python auto echo"


def main() -> int:
    reticulum = RNS.Reticulum(str(CONFIG_DIR))

    identity = load_identity("bob")
    alice = load_identity("alice")

    echo_in = RNS.Destination(
        identity,
        RNS.Destination.IN,
        RNS.Destination.SINGLE,
        APP_NAME,
        ECHO_ASPECT,
    )
    echo_in.set_proof_strategy(RNS.Destination.PROVE_ALL)

    def echo_handler(data: bytes, packet: RNS.Packet) -> None:
        outbound = RNS.Destination(
            alice,
            RNS.Destination.OUT,
            RNS.Destination.SINGLE,
            APP_NAME,
            ECHO_ASPECT,
        )
        send_packet(outbound, data)

    echo_in.set_packet_callback(echo_handler)
    echo_in.announce()

    link_in = RNS.Destination(
        identity,
        RNS.Destination.IN,
        RNS.Destination.SINGLE,
        APP_NAME,
        LINK_ASPECT,
    )

    def link_established(link: RNS.Link) -> None:
        def packet_handler(data: bytes, packet: RNS.Packet) -> None:
            RNS.Packet(link, data).send()

        link.set_packet_callback(packet_handler)

    link_in.set_link_established_callback(link_established)
    link_in.announce()

    router = LXMF.LXMRouter()
    delivery_destination = router.register_delivery_identity(identity)

    def delivery_callback(message: LXMF.LXMessage) -> None:
        reply = LXMF.LXMessage(
            message.source,
            delivery_destination,
            message.content,
            message.title,
            desired_method=LXMF.LXMessage.OPPORTUNISTIC,
        )
        reply.defer_stamp = True
        reply.send()

    router.register_delivery_callback(delivery_callback)
    delivery_destination.announce()

    print(f"READY echo={echo_in.hash.hex()} link={link_in.hash.hex()} lxmf={delivery_destination.hash.hex()}", flush=True)

    outbound = RNS.Destination(
        alice,
        RNS.Destination.OUT,
        RNS.Destination.SINGLE,
        APP_NAME,
        ECHO_ASPECT,
    )
    send_packet(outbound, GREETING)

    while True:
        time.sleep(1)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
