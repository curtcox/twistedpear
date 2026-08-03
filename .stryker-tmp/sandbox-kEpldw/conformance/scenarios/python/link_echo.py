#!/usr/bin/env python3
"""Python RNS link echo peer for M4 interop scenarios.

Announces a fixed golden-vector identity, accepts incoming links, and echoes
payloads back over the established link.
"""

from __future__ import annotations

import time
from pathlib import Path

import RNS

from load_identity import load_identity

CONFIG_DIR = Path(__file__).resolve().parents[1] / "config" / "link-echo"
APP_NAME = "example"
ASPECT = "link"


def main() -> int:
    reticulum = RNS.Reticulum(str(CONFIG_DIR))

    identity = load_identity("bob")
    inbound = RNS.Destination(
        identity,
        RNS.Destination.IN,
        RNS.Destination.SINGLE,
        APP_NAME,
        ASPECT,
    )

    def link_established(link: RNS.Link) -> None:
        def packet_handler(data: bytes, packet: RNS.Packet) -> None:
            RNS.Packet(link, data).send()

        link.set_packet_callback(packet_handler)

    inbound.set_link_established_callback(link_established)
    inbound.announce()
    print(f"READY {inbound.hash.hex()}", flush=True)

    while True:
        time.sleep(2)
        inbound.announce()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
