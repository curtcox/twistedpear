#!/usr/bin/env python3
"""Publish a PROPAGATED LXMF message to a propagation node over TCP."""

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
APP_NAME = "lxmf"


def wait_for_path(destination_hash: bytes, timeout_s: float = 20.0) -> None:
    deadline = time.time() + timeout_s
    last_request = 0.0
    while time.time() < deadline:
        if RNS.Transport.has_path(destination_hash):
            return
        now = time.time()
        if now - last_request >= 1.0:
            RNS.Transport.request_path(destination_hash)
            last_request = now
        time.sleep(0.1)

    raise TimeoutError(f"Timed out waiting for path to {destination_hash.hex()}")


def wait_for_transfer(router: LXMF.LXMRouter, timeout_s: float = 20.0) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if router.propagation_transfer_state in (
            LXMF.LXMRouter.PR_COMPLETE,
            LXMF.LXMRouter.PR_IDLE,
        ):
            return
        time.sleep(0.1)

    raise TimeoutError("Timed out waiting for propagation transfer")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target-host", default="127.0.0.1")
    parser.add_argument("--target-port", type=int, default=4245)
    parser.add_argument("--propagation-hash", required=True)
    parser.add_argument("--recipient", default="alice")
    parser.add_argument("--content", default="Hello from Python propagation publisher")
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

    _reticulum = RNS.Reticulum(str(CONFIG_DIR))
    publisher = load_identity("bob")
    recipient = load_identity(args.recipient)

    lxmf_storage = Path(
        tempfile.mkdtemp(prefix="twistedpear-propagation-publish-lxmf-")
    )
    atexit.register(shutil.rmtree, lxmf_storage, ignore_errors=True)
    router = LXMF.LXMRouter(storagepath=str(lxmf_storage))
    delivery = router.register_delivery_identity(publisher)
    delivery.announce()

    propagation_hash = bytes.fromhex(args.propagation_hash)
    wait_for_path(propagation_hash)

    router.set_outbound_propagation_node(propagation_hash)

    recipient_out = RNS.Destination(
        recipient,
        RNS.Destination.OUT,
        RNS.Destination.SINGLE,
        APP_NAME,
        "delivery",
    )

    message = LXMF.LXMessage(
        recipient_out,
        delivery,
        args.content.encode("utf-8"),
        "PropagationPublish",
        desired_method=LXMF.LXMessage.PROPAGATED,
    )
    message.defer_stamp = True
    router.handle_outbound(message)

    deadline = time.time() + 20.0
    while time.time() < deadline:
        if message.state == LXMF.LXMessage.SENT:
            break
        time.sleep(0.1)
    else:
        raise TimeoutError(f"propagation publish timed out in state {message.state}")

    print("PUBLISH_OK", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
