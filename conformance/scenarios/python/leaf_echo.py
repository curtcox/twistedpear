#!/usr/bin/env python3
"""Python RNS leaf echo peer for M3 interop scenarios.

Announces a fixed golden-vector identity, echoes data packets to senders, and
optionally sends a greeting to a configured peer destination hash.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import RNS

from load_identity import load_identity

CONFIG_DIR = Path(__file__).resolve().parents[1] / "config" / "leaf-echo"
APP_NAME = "example"
ASPECT = "echo"
GREETING = b"hello from python leaf echo"


def main() -> int:
    reticulum = RNS.Reticulum(str(CONFIG_DIR))

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
        outbound.send(data)

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
    outbound.send(GREETING)

    while True:
        time.sleep(1)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
