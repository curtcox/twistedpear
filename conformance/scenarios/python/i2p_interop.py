#!/usr/bin/env python3
"""Python RNS I2P interop peer for M7 scenarios.

Runs echo, link, and LXMF delivery destinations over a connectable I2PInterface
so TypeScript can exercise interop through an external i2pd SAM bridge.
"""

from __future__ import annotations

import os
import time
from pathlib import Path

import LXMF
import RNS

from load_identity import load_identity

CONFIG_DIR = Path(__file__).resolve().parents[1] / "config" / "i2p-interop"
STATE_DIR = Path(__file__).resolve().parents[1] / "state"
APP_NAME = "example"
ECHO_ASPECT = "echo"
LINK_ASPECT = "link"
GREETING = b"hello from python i2p echo"
I2P_READY_TIMEOUT_S = int(os.environ.get("I2P_READY_TIMEOUT_S", "180"))


def find_i2p_interface() -> tuple[object, str] | tuple[None, None]:
    for iface in RNS.Transport.interfaces:
        if iface.__class__.__name__ != "I2PInterface":
            continue

        b32 = getattr(iface, "b32", None)
        if b32 and iface.online:
            return iface, f"{b32}.b32.i2p"

    return None, None


def wait_for_i2p_interface() -> tuple[object, str]:
    deadline = time.time() + I2P_READY_TIMEOUT_S
    while time.time() < deadline:
        iface, destination = find_i2p_interface()
        if destination is not None:
            return iface, destination

        time.sleep(1)

    raise TimeoutError(
        f"I2P interface did not become online within {I2P_READY_TIMEOUT_S}s "
        f"(check i2pd SAM at {os.environ.get('I2P_SAM_ADDRESS', '127.0.0.1:7656')})"
    )


def write_ready_state(destination: str, echo_hash: str, link_hash: str, lxmf_hash: str) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    (STATE_DIR / "i2p-b32.txt").write_text(destination, encoding="utf-8")
    print(
        f"READY b32={destination} echo={echo_hash} link={link_hash} lxmf={lxmf_hash}",
        flush=True,
    )


def main() -> int:
    reticulum = RNS.Reticulum(str(CONFIG_DIR))

    _, destination = wait_for_i2p_interface()

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
        outbound.send(data)

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
            link.send(data)

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

    write_ready_state(
        destination,
        echo_in.hash.hex(),
        link_in.hash.hex(),
        delivery_destination.hash.hex(),
    )

    outbound = RNS.Destination(
        alice,
        RNS.Destination.OUT,
        RNS.Destination.SINGLE,
        APP_NAME,
        ECHO_ASPECT,
    )
    outbound.send(GREETING)

    while True:
        time.sleep(1)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
