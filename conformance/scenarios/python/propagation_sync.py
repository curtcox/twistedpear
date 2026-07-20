#!/usr/bin/env python3
"""Sync LXMF messages from a propagation node over TCP."""

from __future__ import annotations

import argparse
import atexit
import shutil
import tempfile
import time
from pathlib import Path

import LXMF
import RNS

from load_identity import load_identity

CONFIG_DIR = Path(__file__).resolve().parents[1] / "config" / "propagation-client"


def wait_for_path(destination_hash: bytes, timeout_s: float = 45.0) -> None:
    deadline = time.time() + timeout_s
    last_request = 0.0
    while time.time() < deadline:
        if RNS.Transport.has_path(destination_hash):
            return
        # Announces alone are easy to miss on cold TCP attach; solicit like transport_leaf.
        now = time.time()
        if now - last_request >= 1.0:
            RNS.Transport.request_path(destination_hash)
            last_request = now
        time.sleep(0.1)

    raise TimeoutError(f"Timed out waiting for path to {destination_hash.hex()}")


def wait_for_transfer(router: LXMF.LXMRouter, timeout_s: float = 30.0) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if router.propagation_transfer_state in (
            LXMF.LXMRouter.PR_COMPLETE,
            LXMF.LXMRouter.PR_IDLE,
        ):
            return
        time.sleep(0.1)

    raise TimeoutError(f"Propagation sync timed out in state {router.propagation_transfer_state}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target-host", default="127.0.0.1")
    parser.add_argument("--target-port", type=int, default=4245)
    parser.add_argument("--propagation-hash", required=True)
    parser.add_argument("--recipient", default="alice")
    args = parser.parse_args()

    client_config = CONFIG_DIR / "config"
    client_config.parent.mkdir(parents=True, exist_ok=True)
    client_config.write_text(
        f"""[reticulum]
  share_instance = No
  enable_transport = No

[logging]
  loglevel = 2

[interfaces]
  [[Propagation Client TCP]]
    type = TCPClientInterface
    enabled = Yes
    target_host = {args.target_host}
    target_port = {args.target_port}
"""
    )

    reticulum = RNS.Reticulum(str(CONFIG_DIR))
    recipient = load_identity(args.recipient)

    lxmf_storage = Path(tempfile.mkdtemp(prefix="twistedpear-propagation-sync-lxmf-"))
    atexit.register(shutil.rmtree, lxmf_storage, ignore_errors=True)
    router = LXMF.LXMRouter(storagepath=str(lxmf_storage))
    delivery = router.register_delivery_identity(recipient)
    delivery.announce()

    received: list[str] = []

    def delivery_callback(message: LXMF.LXMessage) -> None:
        received.append(message.content_as_string())

    router.register_delivery_callback(delivery_callback)

    propagation_hash = bytes.fromhex(args.propagation_hash)
    wait_for_path(propagation_hash)

    router.set_outbound_propagation_node(propagation_hash)
    router.request_messages_from_propagation_node(recipient)
    wait_for_transfer(router)

    if not received:
        print("SYNC_EMPTY", flush=True)
        return 1

    print(f"SYNC_OK {received[-1]}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
