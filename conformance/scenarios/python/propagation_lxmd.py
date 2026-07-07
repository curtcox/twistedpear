#!/usr/bin/env python3
"""Bootstrap lxmd with a pinned golden-vector identity and run as propagation node."""

from __future__ import annotations

import os
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
    destination = RNS.Destination(
        identity,
        RNS.Destination.IN,
        RNS.Destination.SINGLE,
        "lxmf",
        "propagation",
    )
    return destination.hash.hex()


def main() -> int:
    ensure_lxmd_layout()
    print(f"READY {propagation_hash()}", flush=True)

    os.execvp(
        "lxmd",
        [
            "lxmd",
            "--config",
            str(LXMD_CONFIG_DIR),
            "--rnsconfig",
            str(RNS_CONFIG),
            "--propagation-node",
            "-q",
        ],
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        raise SystemExit(0)
