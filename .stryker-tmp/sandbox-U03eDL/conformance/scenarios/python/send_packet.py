"""Send data via an outbound RNS destination.

RNS 0.9.5 removed ``Destination.send``; use ``RNS.Packet`` instead.
"""

from __future__ import annotations

import RNS


def send_packet(destination: RNS.Destination, data: bytes) -> RNS.Packet:
    packet = RNS.Packet(destination, data)
    packet.send()
    return packet
