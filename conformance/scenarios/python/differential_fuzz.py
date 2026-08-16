"""Reference half of the differential fuzzer.

Reads ``{"cases": [{"target": ..., "inputHex": ...}]}`` on stdin and writes
``{"verdicts": [...]}`` on stdout, one verdict per case in the same order. It
runs inside ``conformance/docker``, where ``rns==0.9.5`` and ``lxmf==0.7.0`` are
pinned, so "what the reference does" is a fixed answer rather than whatever
happens to be installed.

The canonical form is a string grammar shared with
``conformance/fuzz/differential.mjs``. Comparing decoded values across two
languages by their native repr is a trap: Python prints floats one way and
JavaScript another, Python has arbitrary-precision integers, and both have their
own opinion about bytes-versus-text. The grammar below sidesteps all of it --
floats travel as their IEEE-754 bits, ints as decimal digits, and bytes and text
as hex with different tags, so equality of the strings means equality of the
values and nothing else.

Nothing here imports the TypeScript side; it does not know what the other
implementation answered. That is the point -- an oracle that can see the answer
it is grading is not an oracle.
"""

from __future__ import annotations

import json
import struct
import sys
from collections.abc import Callable
from typing import Any

import RNS
from RNS.Packet import Packet
from RNS.Resource import ResourceAdvertisement
from RNS.vendor import umsgpack


def canonical(value: Any) -> str:
    """Render a decoded msgpack value in the shared canonical grammar."""
    if value is None:
        return "n"
    if isinstance(value, bool):
        # Before int: bool is a subclass of int in Python, and folding True into
        # 1 would hide a genuine type divergence.
        return "b:true" if value else "b:false"
    if isinstance(value, int):
        return f"i:{value}"
    if isinstance(value, float):
        return "f:" + struct.pack(">d", value).hex()
    if isinstance(value, str):
        return "s:" + value.encode("utf-8").hex()
    if isinstance(value, (bytes, bytearray)):
        return "x:" + bytes(value).hex()
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(canonical(item) for item in value) + "]"
    if isinstance(value, dict):
        entries = sorted(f"{canonical(key)}={canonical(item)}" for key, item in value.items())
        return "m{" + ",".join(entries) + "}"
    return "?:" + type(value).__name__


def canonical_fields(fields: dict[str, Any]) -> str:
    """Canonicalise an already-typed field mapping (packet and advertisement)."""
    entries = sorted(f"{name}={canonical(value)}" for name, value in fields.items())
    return "m{" + ",".join(entries) + "}"


def packet_verdict(data: bytes) -> dict[str, Any]:
    """Run ``RNS.Packet.unpack`` on raw bytes, without a live Reticulum.

    ``Packet.__init__`` wants a destination and a transport instance; inbound
    packets never go through it. Transport builds the object and assigns ``raw``
    directly, which is what this mirrors -- calling the constructor instead would
    be measuring a code path no wire byte ever reaches.
    """
    packet = Packet.__new__(Packet)
    packet.raw = data
    if not packet.unpack():
        return {"accepted": False, "canonical": None, "error": None}

    return {
        "accepted": True,
        "canonical": canonical_fields(
            {
                "flags": packet.flags,
                "hops": packet.hops,
                "headerType": packet.header_type,
                "contextFlag": packet.context_flag,
                "transportType": packet.transport_type,
                "destinationType": packet.destination_type,
                "packetType": packet.packet_type,
                "transportId": packet.transport_id,
                "destinationHash": packet.destination_hash,
                "context": packet.context,
                "data": packet.data,
            }
        ),
        "error": None,
    }


def advertisement_verdict(data: bytes) -> dict[str, Any]:
    """Run ``ResourceAdvertisement.unpack``, whose contract is to raise."""
    adv = ResourceAdvertisement.unpack(data)
    return {
        "accepted": True,
        "canonical": canonical_fields(
            {
                name: getattr(adv, name)
                for name in ("t", "d", "n", "h", "r", "o", "m", "f", "i", "l", "q")
            }
            | {name: getattr(adv, name) for name in ("e", "c", "s", "u", "p")}
        ),
        "error": None,
    }


def msgpack_verdict(data: bytes) -> dict[str, Any]:
    """Run ``umsgpack.unpackb``, the decoder LXMF itself uses."""
    return {
        "accepted": True,
        "canonical": canonical(umsgpack.unpackb(data)),
        "error": None,
    }


TARGETS: dict[str, Callable[[bytes], dict[str, Any]]] = {
    "packet-unpack": packet_verdict,
    "resource-advert": advertisement_verdict,
    "msgpack": msgpack_verdict,
}


def verdict_for(target: str, data: bytes) -> dict[str, Any]:
    """A verdict for one case, turning any exception into a rejection.

    The exception *type* is reported, not the message: messages interpolate the
    offending byte, so keying divergence classes on them would mint a new class
    per bad input and make the allowance file useless.
    """
    handler = TARGETS.get(target)
    if handler is None:
        return {
            "accepted": False,
            "canonical": None,
            "error": f"UnknownTarget: {target}",
        }

    try:
        return handler(data)
    except Exception as error:  # noqa: BLE001 - any failure is a rejection
        return {
            "accepted": False,
            "canonical": None,
            "error": type(error).__name__,
        }


def main() -> int:
    request = json.load(sys.stdin)
    verdicts = [
        verdict_for(case["target"], bytes.fromhex(case["inputHex"])) for case in request["cases"]
    ]
    json.dump(
        {
            "reference": {
                "rns": RNS.__version__,
                "lxmf": _lxmf_version(),
            },
            "verdicts": verdicts,
        },
        sys.stdout,
    )
    return 0


def _lxmf_version() -> str:
    import LXMF

    return str(getattr(LXMF, "__version__", "unknown"))


if __name__ == "__main__":
    raise SystemExit(main())
