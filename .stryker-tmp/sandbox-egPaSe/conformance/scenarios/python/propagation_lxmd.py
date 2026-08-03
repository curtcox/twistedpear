#!/usr/bin/env python3
"""Bootstrap lxmd with a pinned golden-vector identity and run as propagation node."""

from __future__ import annotations

import os
import socket
import subprocess
import time
from pathlib import Path

import RNS

from load_identity import load_identity

ROOT = Path(__file__).resolve().parents[1]
RNS_CONFIG = ROOT / "config" / "propagation-node"
LXMD_CONFIG_DIR = ROOT / "config" / "lxmd-runtime"
LXMD_CONFIG = LXMD_CONFIG_DIR / "config"
IDENTITY_PATH = LXMD_CONFIG_DIR / "identity"
STORAGE_DIR = LXMD_CONFIG_DIR / "storage"
LXMD_TEMPLATE = ROOT / "config" / "lxmd" / "config"
LISTEN_PORT = 4242


def ensure_lxmd_layout() -> None:
    LXMD_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    (STORAGE_DIR / "messages").mkdir(parents=True, exist_ok=True)

    if not LXMD_CONFIG.is_file():
        LXMD_CONFIG.write_text(LXMD_TEMPLATE.read_text())

    if not IDENTITY_PATH.is_file():
        identity = load_identity("bob")
        identity.to_file(str(IDENTITY_PATH))


def propagation_hash() -> str:
    identity = load_identity("bob")
    # Compute the hash without constructing a Destination — that requires an
    # initialized Reticulum Transport.owner, which lxmd provides after start.
    return RNS.Destination.hash(identity, "lxmf", "propagation").hex()


def wait_for_listen(port: int, timeout_s: float = 30.0) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1.0):
                return
        except OSError:
            time.sleep(0.2)
    raise TimeoutError(f"lxmd did not listen on {port} within {timeout_s}s")


def main() -> int:
    ensure_lxmd_layout()
    hash_hex = propagation_hash()
    child = subprocess.Popen(
        [
            "lxmd",
            "--config",
            str(LXMD_CONFIG_DIR),
            "--rnsconfig",
            str(RNS_CONFIG),
            "--propagation-node",
            "-q",
        ],
        env=os.environ.copy(),
    )
    try:
        wait_for_listen(LISTEN_PORT)
        print(f"READY {hash_hex}", flush=True)
        return child.wait()
    except BaseException:
        child.terminate()
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.kill()
        raise


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
