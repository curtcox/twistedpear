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


def base_packet_corpus() -> dict:
    identity_hash = bytes.fromhex("14ae36c9c3feac7be58c027babc87580")

    def destination_entry(name: str, app_name: str, aspects: list[str]) -> dict:
        expanded_without_identity = ".".join([app_name] + aspects)
        expanded = expanded_without_identity + "." + identity_hash.hex()
        name_hash = hashlib.sha256(expanded_without_identity.encode("utf-8")).digest()[:10]
        destination_hash = hashlib.sha256(name_hash + identity_hash).digest()[:16]
        return {
            "name": name,
            "identityHashHex": identity_hash.hex(),
            "appName": app_name,
            "aspects": aspects,
            "expandedName": expanded,
            "nameHashHex": name_hash.hex(),
            "destinationHashHex": destination_hash.hex(),
        }

    def packet_entry(
        name: str,
        header_type: int,
        context_flag: int,
        transport_type: int,
        destination_type: int,
        packet_type: int,
        hops: int,
        destination_hash: bytes,
        context: int,
        data: bytes,
        transport_id: bytes | None = None,
    ) -> dict:
        flags = (
            (header_type << 6)
            | (context_flag << 5)
            | (transport_type << 4)
            | (destination_type << 2)
            | packet_type
        )
        if header_type == 1:
            if transport_id is None:
                raise ValueError("HEADER_2 packet vectors require transport_id")
            raw = bytes([flags, hops]) + transport_id + destination_hash + bytes([context]) + data
            hashable = bytes([raw[0] & 0x0F]) + raw[18:]
        else:
            raw = bytes([flags, hops]) + destination_hash + bytes([context]) + data
            hashable = bytes([raw[0] & 0x0F]) + raw[2:]

        entry = {
            "name": name,
            "headerType": header_type,
            "contextFlag": context_flag,
            "transportType": transport_type,
            "destinationType": destination_type,
            "packetType": packet_type,
            "hops": hops,
            "destinationHashHex": destination_hash.hex(),
            "context": context,
            "dataHex": data.hex(),
            "rawHex": raw.hex(),
            "hashablePartHex": hashable.hex(),
            "packetHashHex": hashlib.sha256(hashable).hexdigest(),
        }
        if transport_id is not None:
            entry["transportIdHex"] = transport_id.hex()
        return entry

    destination_hash = bytes.fromhex("086b1879b803be27667b9f1e6b7d0c43")

    return {
        "upstream": {
            "reticulumVersion": "0.9.4",
            "generatedBy": "conformance/vectors/generate.py",
        },
        "destinations": [
            destination_entry("single-example-chat", "example", ["chat"]),
            destination_entry("single-example-announce", "example", ["announce"]),
        ],
        "packets": [
            packet_entry(
                "header1-group-data-request",
                header_type=0,
                context_flag=0,
                transport_type=0,
                destination_type=1,
                packet_type=0,
                hops=2,
                destination_hash=destination_hash,
                context=9,
                data=b"hello packet",
            ),
            packet_entry(
                "header2-announce-path-response",
                header_type=1,
                context_flag=0,
                transport_type=1,
                destination_type=0,
                packet_type=1,
                hops=3,
                transport_id=bytes.fromhex("00112233445566778899aabbccddeeff"),
                destination_hash=destination_hash,
                context=11,
                data=b"announce",
            ),
        ],
    }


def rns_packet_corpus() -> dict:
    import RNS

    x25519_a = bytes(range(1, 33))
    ed_a = bytes(range(33, 65))
    alice = RNS.Identity.from_bytes(x25519_a + ed_a)
    name_hash = hashlib.sha256(b"example.announce").digest()[:10]
    destination_hash = hashlib.sha256(name_hash + alice.hash).digest()[:16]
    random_hash = bytes.fromhex("0102030405060708090a")
    app_data = b"announce app data"
    ratchet_private = bytes([0x22] * 32)
    ratchet_public = RNS.Identity._ratchet_public_bytes(ratchet_private)

    def announce_entry(name: str, ratchet: bytes = b"") -> dict:
        signed_data = destination_hash + alice.get_public_key() + name_hash + random_hash + ratchet + app_data
        signature = alice.sign(signed_data)
        data = alice.get_public_key() + name_hash + random_hash + ratchet + signature + app_data
        flags = (
            (RNS.Packet.HEADER_1 << 6)
            | ((RNS.Packet.FLAG_SET if ratchet else RNS.Packet.FLAG_UNSET) << 5)
            | (0 << 4)
            | (RNS.Destination.SINGLE << 2)
            | RNS.Packet.ANNOUNCE
        )
        raw = bytes([flags, 0]) + destination_hash + bytes([RNS.Packet.NONE]) + data
        return {
            "name": name,
            "destinationHashHex": destination_hash.hex(),
            "nameHashHex": name_hash.hex(),
            "publicKeyHex": alice.get_public_key().hex(),
            "randomHashHex": random_hash.hex(),
            "ratchetPublicKeyHex": ratchet.hex() if ratchet else None,
            "appDataHex": app_data.hex(),
            "signatureHex": signature.hex(),
            "dataHex": data.hex(),
            "rawHex": raw.hex(),
        }

    corpus = base_packet_corpus()
    corpus["upstream"] = {
        "reticulumVersion": RNS.__version__ if hasattr(RNS, "__version__") else "0.9.4",
        "generatedBy": "conformance/vectors/generate.py (RNS)",
    }
    corpus["announces"] = [
        announce_entry("alice-example-announce-app-data"),
        announce_entry("alice-example-announce-ratchet", ratchet_public),
    ]
    return corpus


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
        (ROOT / "packet.json").write_text(json.dumps(base_packet_corpus(), indent=2) + "\n")
        print("RNS not installed; skipping identity.json generation")
        return

    (ROOT / "identity.json").write_text(json.dumps(identity_corpus, indent=2) + "\n")
    (ROOT / "packet.json").write_text(json.dumps(rns_packet_corpus(), indent=2) + "\n")

    try:
        lxmf_corpus = lxmf_message_corpus(identity_corpus)
        (ROOT / "lxmf.json").write_text(json.dumps(lxmf_corpus, indent=2) + "\n")
    except ImportError:
        print("LXMF not installed; skipping lxmf.json generation")


def lxmf_message_corpus(identity_corpus: dict) -> dict:
    import LXMF
    import RNS

    identities = {
        entry["name"]: load_identity_from_vector(entry)
        for entry in identity_corpus["identities"]
    }

    alice = identities["alice"]
    bob = identities["bob"]

    alice_delivery = RNS.Destination(
        alice, RNS.Destination.IN, RNS.Destination.SINGLE, "lxmf", "delivery"
    )
    bob_delivery = RNS.Destination(
        bob, RNS.Destination.OUT, RNS.Destination.SINGLE, "lxmf", "delivery"
    )

    def message_entry(name: str, title: str, content: str, fields: dict | None = None) -> dict:
        fields = fields or {}
        message = LXMF.LXMessage(
            bob_delivery,
            alice_delivery,
            content,
            title,
            desired_method=LXMF.LXMessage.DIRECT,
        )
        message.timestamp = 1700000000.0
        message.defer_stamp = True
        message.pack()

        return {
            "name": name,
            "timestamp": message.timestamp,
            "title": title,
            "content": content,
            "fieldsHex": {hex(key): value.hex() for key, value in fields.items()},
            "destinationHashHex": message.destination_hash.hex(),
            "sourceHashHex": message.source_hash.hex(),
            "messageHashHex": message.hash.hex(),
            "signatureHex": message.signature.hex(),
            "packedHex": message.packed.hex(),
        }

    return {
        "upstream": {
            "lxmfVersion": getattr(LXMF, "__version__", "0.7.0"),
            "generatedBy": f"python lxmf {getattr(LXMF, '__version__', '0.7.0')}",
        },
        "messages": [
            message_entry("empty-fields", "", ""),
            message_entry("hello-world", "Hello", "World"),
            message_entry(
                "with-fields",
                "Test",
                "Body",
                {LXMF.FIELD_THREAD: b"thread-id-123"},
            ),
        ],
    }


def load_identity_from_vector(entry: dict):
    import RNS

    private_key = bytes.fromhex(entry["privateKeyHex"])
    identity = RNS.Identity(create_keys=False)
    identity.load_private_key(private_key)
    return identity


if __name__ == "__main__":
    main()
