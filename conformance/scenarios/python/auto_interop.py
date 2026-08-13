#!/usr/bin/env python3
"""Python RNS AutoInterface interop peer for M3 scenarios.

Registers echo, link, and LXMF delivery destinations on one AutoInterface node so
TypeScript can exercise the full interop matrix over LAN discovery.
"""

from __future__ import annotations

import atexit
import shutil
import socketserver
import tempfile
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
    # Permit cooperative binds when a peer deliberately shares the AutoInterface
    # data/discovery ports (RNS data UDPServer defaults to exclusive binds).
    socketserver.UDPServer.allow_reuse_address = True
    if hasattr(socketserver.UDPServer, "allow_reuse_port"):
        socketserver.UDPServer.allow_reuse_port = True

    _reticulum = RNS.Reticulum(str(CONFIG_DIR))
    lxmf_storage = Path(tempfile.mkdtemp(prefix="twistedpear-auto-interop-lxmf-"))
    atexit.register(shutil.rmtree, lxmf_storage, ignore_errors=True)

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

    router = LXMF.LXMRouter(storagepath=str(lxmf_storage))
    delivery_destination = router.register_delivery_identity(identity)
    alice_delivery = RNS.Destination(
        alice,
        RNS.Destination.OUT,
        RNS.Destination.SINGLE,
        "lxmf",
        "delivery",
    )

    def delivery_callback(message: LXMF.LXMessage) -> None:
        print(
            "DELIVERED "
            f"source={message.source_hash.hex()} "
            f"content_bytes={len(message.content)} "
            f"return_path={RNS.Transport.has_path(alice_delivery.hash)}",
            flush=True,
        )
        reply = LXMF.LXMessage(
            alice_delivery,
            delivery_destination,
            message.content,
            message.title,
            desired_method=LXMF.LXMessage.OPPORTUNISTIC,
        )
        reply.defer_stamp = True
        # Match lxmf_echo/i2p_interop: queue via the router so stamp deferral and
        # path requests are applied. LXMessage.send() skips that path.
        router.handle_outbound(reply)
        print(f"REPLY_QUEUED destination={alice_delivery.hash.hex()}", flush=True)

    router.register_delivery_callback(delivery_callback)
    delivery_destination.announce()

    print(
        f"READY echo={echo_in.hash.hex()} link={link_in.hash.hex()} lxmf={delivery_destination.hash.hex()}",
        flush=True,
    )

    outbound = RNS.Destination(
        alice,
        RNS.Destination.OUT,
        RNS.Destination.SINGLE,
        APP_NAME,
        ECHO_ASPECT,
    )
    send_packet(outbound, GREETING)

    while True:
        time.sleep(2)
        echo_in.announce()
        link_in.announce()
        delivery_destination.announce()
        send_packet(outbound, GREETING)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
