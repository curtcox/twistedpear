#!/usr/bin/env python3
"""Generate the deterministic crypto and identity vector corpus.

M0 vectors use standard primitives so TypeScript can run before Docker exists.
When RNS is installed (see conformance/docker or a local venv), identity/token
vectors are generated from the pinned reference implementation.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
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


def base_crypto_corpus() -> dict:
    sha_inputs = {
        "empty": b"",
        "reticulum-phase1": b"reticulum-ts/phase1",
    }
    hmac_key = bytes.fromhex("0b" * 20)
    hmac_input = b"Hi There"
    hkdf_ikm = bytes.fromhex("0b" * 22)
    hkdf_salt = bytes.fromhex("000102030405060708090a0b0c")
    hkdf_info = bytes.fromhex("f0f1f2f3f4f5f6f7f8f9")

    return {
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


def rns_identity_corpus() -> dict:
    import RNS
    from RNS.Cryptography import Token, X25519PrivateKey

    x25519_a = bytes(range(1, 33))
    ed_a = bytes(range(33, 65))
    x25519_b = bytes(range(65, 97))
    ed_b = bytes(range(97, 129))

    alice = RNS.Identity.from_bytes(x25519_a + ed_a)
    bob = RNS.Identity.from_bytes(x25519_b + ed_b)
    bob_recipient = RNS.Identity(create_keys=False)
    bob_recipient.load_public_key(bob.get_public_key())
    alice_recipient = RNS.Identity(create_keys=False)
    alice_recipient.load_public_key(alice.get_public_key())

    token_key = bytes(range(0, 32))
    token = Token(token_key)
    fixed_iv = bytes([0xAA] * 16)
    original_urandom = os.urandom
    os.urandom = lambda count: fixed_iv if count == 16 else original_urandom(count)
    token_plaintext = b"hello reticulum"
    token_ciphertext = token.encrypt(token_plaintext)
    os.urandom = original_urandom

    sign_message = b"test message"
    signature = alice.sign(sign_message)

    shared = bytes([0x55] * 32)
    hkdf_output = RNS.Cryptography.hkdf(
        length=32,
        derive_from=shared,
        salt=alice.hash,
        context=None,
    )

    fixed_ephemeral = bytes([0x11] * 32)
    fixed_token_iv = bytes([0xBB] * 16)
    ratchet_private = bytes([0x22] * 32)
    ratchet_public = RNS.Identity._ratchet_public_bytes(ratchet_private)
    original_generate = X25519PrivateKey.generate
    original_urandom = os.urandom

    def fixed_urandom(count: int) -> bytes:
        if count == 16:
            return fixed_token_iv
        return original_urandom(count)

    os.urandom = fixed_urandom
    X25519PrivateKey.generate = classmethod(
        lambda cls: X25519PrivateKey.from_private_bytes(fixed_ephemeral)
    )
    ct_to_bob = bob_recipient.encrypt(b"alice to bob")
    ct_to_alice = alice_recipient.encrypt(b"bob to alice")
    ct_ratchet = bob_recipient.encrypt(b"via ratchet", ratchet=ratchet_public)
    X25519PrivateKey.generate = original_generate
    os.urandom = original_urandom

    return {
        "upstream": {
            "reticulumVersion": RNS.__version__ if hasattr(RNS, "__version__") else "0.9.4",
            "generatedBy": "conformance/vectors/generate.py (RNS)",
        },
        "identities": [
            {
                "name": "alice",
                "privateKeyHex": (x25519_a + ed_a).hex(),
                "publicKeyHex": alice.get_public_key().hex(),
                "identityHashHex": alice.hash.hex(),
            },
            {
                "name": "bob",
                "privateKeyHex": (x25519_b + ed_b).hex(),
                "publicKeyHex": bob.get_public_key().hex(),
                "identityHashHex": bob.hash.hex(),
            },
        ],
        "token": [
            {
                "name": "fixed-iv",
                "keyHex": token_key.hex(),
                "ivHex": fixed_iv.hex(),
                "plaintextHex": token_plaintext.hex(),
                "ciphertextHex": token_ciphertext.hex(),
            }
        ],
        "signatures": [
            {
                "name": "alice-test-message",
                "identity": "alice",
                "messageHex": sign_message.hex(),
                "signatureHex": signature.hex(),
            }
        ],
        "hkdf": [
            {
                "name": "alice-salt-empty-context",
                "deriveFromHex": shared.hex(),
                "saltIdentity": "alice",
                "contextHex": "",
                "length": 32,
                "outputHex": hkdf_output.hex(),
            }
        ],
        "encryption": [
            {
                "name": "alice-to-bob",
                "sender": "alice",
                "recipient": "bob",
                "plaintextHex": b"alice to bob".hex(),
                "ephemeralPrivateKeyHex": fixed_ephemeral.hex(),
                "tokenIvHex": fixed_token_iv.hex(),
                "ciphertextHex": ct_to_bob.hex(),
            },
            {
                "name": "bob-to-alice",
                "sender": "bob",
                "recipient": "alice",
                "plaintextHex": b"bob to alice".hex(),
                "ephemeralPrivateKeyHex": fixed_ephemeral.hex(),
                "tokenIvHex": fixed_token_iv.hex(),
                "ciphertextHex": ct_to_alice.hex(),
            },
            {
                "name": "bob-ratchet",
                "sender": "alice",
                "recipient": "bob",
                "plaintextHex": b"via ratchet".hex(),
                "ephemeralPrivateKeyHex": fixed_ephemeral.hex(),
                "tokenIvHex": fixed_token_iv.hex(),
                "ratchetPrivateKeyHex": ratchet_private.hex(),
                "ratchetPublicKeyHex": ratchet_public.hex(),
                "ciphertextHex": ct_ratchet.hex(),
            },
        ],
        "ratchets": [
            {
                "name": "fixed-ratchet",
                "privateKeyHex": ratchet_private.hex(),
                "publicKeyHex": ratchet_public.hex(),
                "ratchetIdHex": RNS.Identity._get_ratchet_id(ratchet_public).hex(),
            }
        ],
    }


def main() -> None:
    (ROOT / "crypto.json").write_text(json.dumps(base_crypto_corpus(), indent=2) + "\n")

    try:
        identity_corpus = rns_identity_corpus()
    except ImportError:
        print("RNS not installed; skipping identity.json generation")
        return

    (ROOT / "identity.json").write_text(json.dumps(identity_corpus, indent=2) + "\n")


if __name__ == "__main__":
    main()
