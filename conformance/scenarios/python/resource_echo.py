#!/usr/bin/env python3
"""Python RNS resource echo peer for M5 interop scenarios.

Accepts incoming resources on a link and echoes the payload back to the sender.
"""

from __future__ import annotations

import hashlib
import time
from pathlib import Path

import RNS

from load_identity import load_identity

CONFIG_DIR = Path(__file__).resolve().parents[1] / "config" / "resource-echo"
APP_NAME = "example"
ASPECT = "resource"


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
        link.set_resource_strategy(RNS.Link.ACCEPT_ALL)

        def resource_concluded(resource: RNS.Resource) -> None:
            if resource.status != RNS.Resource.COMPLETE or resource.data is None:
                print("RESOURCE_FAIL", flush=True)
                return

            payload = resource.data
            if hasattr(payload, "read"):
                payload = payload.read()

            digest = hashlib.sha256(payload).hexdigest()
            print(f"RESOURCE_OK {len(payload)} {digest}", flush=True)
            RNS.Resource(payload, link, callback=lambda _resource: None)

        link.set_resource_concluded_callback(resource_concluded)

    inbound.set_link_established_callback(link_established)
    inbound.announce()
    print(f"READY {inbound.hash.hex()}", flush=True)

    while True:
        time.sleep(1)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
