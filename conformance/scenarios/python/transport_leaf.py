#!/usr/bin/env python3
"""Transport-hub leaf peer for Phase 6 transport-role interop.

Connects to the desktop host transport hub as a TCP client. Two instances
(bob echo + alice pinger) prove the hub is the only route between leaves.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import RNS

from load_identity import load_identity

APP_NAME = "example"
ECHO_ASPECT = "echo"
GREETING = b"hello from python transport leaf"


def write_client_config(config_dir: Path, target_host: str, target_port: int) -> None:
    config_dir.mkdir(parents=True, exist_ok=True)
    (config_dir / "config").write_text(
        f"""[reticulum]
  share_instance = No
  enable_transport = No

[logging]
  loglevel = 2

[interfaces]
  [[Hub Transport TCP]]
    type = TCPClientInterface
    enabled = Yes
    target_host = {target_host}
    target_port = {target_port}
"""
    )


def run_echo_leaf(target_host: str, target_port: int) -> int:
    config_dir = Path("/tmp/transport-leaf-bob")
    write_client_config(config_dir, target_host, target_port)

    reticulum = RNS.Reticulum(str(config_dir))
    identity = load_identity("bob")
    alice = load_identity("alice")

    inbound = RNS.Destination(
        identity,
        RNS.Destination.IN,
        RNS.Destination.SINGLE,
        APP_NAME,
        ECHO_ASPECT,
    )
    inbound.set_proof_strategy(RNS.Destination.PROVE_ALL)

    def packet_handler(data: bytes, packet: RNS.Packet) -> None:
        outbound = RNS.Destination(
            alice,
            RNS.Destination.OUT,
            RNS.Destination.SINGLE,
            APP_NAME,
            ECHO_ASPECT,
        )
        outbound.send(data)

    inbound.set_packet_callback(packet_handler)
    inbound.announce()
    print(f"READY {inbound.hash.hex()}", flush=True)

    while True:
        time.sleep(1)


def run_alice_leaf(target_host: str, target_port: int) -> int:
    config_dir = Path("/tmp/transport-leaf-alice")
    write_client_config(config_dir, target_host, target_port)

    reticulum = RNS.Reticulum(str(config_dir))
    identity = load_identity("alice")
    bob = load_identity("bob")

    inbound = RNS.Destination(
        identity,
        RNS.Destination.IN,
        RNS.Destination.SINGLE,
        APP_NAME,
        ECHO_ASPECT,
    )
    inbound.set_proof_strategy(RNS.Destination.PROVE_ALL)
    inbound.announce()
    print(f"READY {inbound.hash.hex()}", flush=True)

    outbound = RNS.Destination(
        bob,
        RNS.Destination.OUT,
        RNS.Destination.SINGLE,
        APP_NAME,
        ECHO_ASPECT,
    )

    deadline = time.time() + 30
    while time.time() < deadline:
        if reticulum.get_path_to(outbound.hash) is not None:
            outbound.send(GREETING)
            break
        time.sleep(0.25)

    while True:
        time.sleep(1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--role", choices=("echo", "pinger"), required=True)
    args = parser.parse_args()

    target_host = os.environ.get("TRANSPORT_HUB_HOST", "host.docker.internal")
    target_port = int(os.environ.get("TRANSPORT_HUB_PORT", "4250"))

    if args.role == "echo":
        return run_echo_leaf(target_host, target_port)
    return run_alice_leaf(target_host, target_port)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
