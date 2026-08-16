#!/usr/bin/env python3
"""Python LXMF echo peer for M7 interop scenarios.

Registers an lxmf.delivery destination and echoes received LXMF messages back
to the sender using opportunistic delivery.
"""

from __future__ import annotations

import time
from pathlib import Path

import LXMF
import RNS
from load_identity import load_identity

CONFIG_DIR = Path(__file__).resolve().parents[1] / "config" / "lxmf-echo"
APP_NAME = "lxmf"
DELIVERY_ASPECT = "delivery"


def main() -> int:
    _reticulum = RNS.Reticulum(str(CONFIG_DIR))

    identity = load_identity("bob")
    alice_identity = load_identity("alice")
    router = LXMF.LXMRouter(storagepath="/tmp/lxmf-echo")
    delivery_destination = router.register_delivery_identity(identity)
    alice_destination = RNS.Destination(
        alice_identity,
        RNS.Destination.OUT,
        RNS.Destination.SINGLE,
        APP_NAME,
        DELIVERY_ASPECT,
    )

    def delivery_callback(message: LXMF.LXMessage) -> None:
        print(
            "DELIVERED "
            f"source={message.source_hash.hex()} "
            f"content_bytes={len(message.content)} "
            f"return_path={RNS.Transport.has_path(alice_destination.hash)}",
            flush=True,
        )
        reply = LXMF.LXMessage(
            alice_destination,
            delivery_destination,
            message.content,
            message.title,
            desired_method=LXMF.LXMessage.OPPORTUNISTIC,
        )
        reply.defer_stamp = True
        router.handle_outbound(reply)
        print(f"REPLY_QUEUED destination={alice_destination.hash.hex()}", flush=True)

    router.register_delivery_callback(delivery_callback)
    delivery_destination.announce()
    print(f"READY {delivery_destination.hash.hex()}", flush=True)

    while True:
        time.sleep(2)
        delivery_destination.announce()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0) from None
