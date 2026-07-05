#!/usr/bin/env python3
"""Python LXMF echo peer for M7 interop scenarios.

Registers an lxmf.delivery destination and echoes received LXMF messages back
to the sender using opportunistic delivery.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import LXMF
import RNS

from load_identity import load_identity

CONFIG_DIR = Path(__file__).resolve().parents[1] / "config" / "lxmf-echo"
APP_NAME = "lxmf"
DELIVERY_ASPECT = "delivery"


def main() -> int:
    reticulum = RNS.Reticulum(str(CONFIG_DIR))

    identity = load_identity("bob")
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
    print(f"READY {delivery_destination.hash.hex()}", flush=True)

    while True:
        time.sleep(1)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
