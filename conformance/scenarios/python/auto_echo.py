#!/usr/bin/env python3
"""Python RNS AutoInterface echo peer for M3 interop scenarios."""

from __future__ import annotations

import time
from pathlib import Path

import RNS
from load_identity import load_identity
from send_packet import send_packet

CONFIG_DIR = Path(__file__).resolve().parents[1] / "config" / "auto-echo"
APP_NAME = "example"
ASPECT = "echo"
GREETING = b"hello from python auto echo"


def main() -> int:
    _reticulum = RNS.Reticulum(str(CONFIG_DIR))

    identity = load_identity("bob")
    alice = load_identity("alice")
    inbound = RNS.Destination(
        identity,
        RNS.Destination.IN,
        RNS.Destination.SINGLE,
        APP_NAME,
        ASPECT,
    )
    inbound.set_proof_strategy(RNS.Destination.PROVE_ALL)

    def packet_handler(data: bytes, packet: RNS.Packet) -> None:
        outbound = RNS.Destination(
            alice,
            RNS.Destination.OUT,
            RNS.Destination.SINGLE,
            APP_NAME,
            ASPECT,
        )
        send_packet(outbound, data)

    inbound.set_packet_callback(packet_handler)
    inbound.announce()
    print(f"READY {inbound.hash.hex()}", flush=True)

    outbound = RNS.Destination(
        alice,
        RNS.Destination.OUT,
        RNS.Destination.SINGLE,
        APP_NAME,
        ASPECT,
    )
    send_packet(outbound, GREETING)

    while True:
        time.sleep(1)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0) from None
