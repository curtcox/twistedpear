#!/usr/bin/env python3
"""Generate the deterministic M0 crypto vector corpus.

The M0 vectors intentionally use standard primitives so the TypeScript harness can run
before the Python RNS image exists locally. Later milestones should extend this script
inside the pinned RNS container with identity, destination, packet, and announce vectors.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def hkdf_sha256(ikm: bytes, salt: bytes, info: bytes, length: int) -> bytes:
    prk = hmac.new(salt, ikm, hashlib.sha256).digest()
    output = b""
    previous = b""
    counter = 1

    while len(output) < length:
        previous = hmac.new(prk, previous + info + bytes([counter]), hashlib.sha256).digest()
        output += previous
        counter += 1

    return output[:length]


def main() -> None:
    sha_inputs = {
        "empty": b"",
        "reticulum-phase1": b"reticulum-ts/phase1",
    }
    hmac_key = bytes.fromhex("0b" * 20)
    hmac_input = b"Hi There"
    hkdf_ikm = bytes.fromhex("0b" * 22)
    hkdf_salt = bytes.fromhex("000102030405060708090a0b0c")
    hkdf_info = bytes.fromhex("f0f1f2f3f4f5f6f7f8f9")

    corpus = {
        "upstream": {
            "reticulumVersion": "0.9.4",
            "lxmfVersion": "0.7.0",
            "generatedBy": "conformance/vectors/generate.py",
        },
        "sha256": [
            {
                "name": name,
                "inputHex": value.hex(),
                "digestHex": hashlib.sha256(value).hexdigest(),
            }
            for name, value in sha_inputs.items()
        ],
        "hmacSha256": [
            {
                "name": "rfc4231-case-1",
                "keyHex": hmac_key.hex(),
                "inputHex": hmac_input.hex(),
                "digestHex": hmac.new(hmac_key, hmac_input, hashlib.sha256).hexdigest(),
            }
        ],
        "hkdfSha256": [
            {
                "name": "rfc5869-case-1",
                "keyMaterialHex": hkdf_ikm.hex(),
                "saltHex": hkdf_salt.hex(),
                "infoHex": hkdf_info.hex(),
                "length": 42,
                "outputHex": hkdf_sha256(hkdf_ikm, hkdf_salt, hkdf_info, 42).hex(),
            }
        ],
    }

    (ROOT / "crypto.json").write_text(json.dumps(corpus, indent=2) + "\n")


if __name__ == "__main__":
    main()
