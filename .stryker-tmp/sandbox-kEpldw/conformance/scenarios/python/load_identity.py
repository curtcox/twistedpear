"""Load pinned golden-vector identities for interop scenarios."""

from __future__ import annotations

import json
from pathlib import Path

import RNS

ROOT = Path(__file__).resolve().parents[2]
IDENTITY_VECTORS = ROOT / "vectors" / "identity.json"


def load_identity(name: str) -> RNS.Identity:
    corpus = json.loads(IDENTITY_VECTORS.read_text())
    for entry in corpus["identities"]:
        if entry["name"] == name:
            identity = RNS.Identity(create_keys=False)
            identity.load_private_key(bytes.fromhex(entry["privateKeyHex"]))
            return identity

    raise KeyError(f"Unknown identity vector: {name}")
