// @ts-nocheck
import type { ParsedAnnounce } from "../../packages/reticulum-ts/src/announce.js";
import { Announce } from "../../packages/reticulum-ts/src/announce.js";
import { bytesToHex } from "../../packages/reticulum-ts/src/crypto/bytes.js";
import type { CryptoProvider } from "../../packages/reticulum-ts/src/crypto/provider.js";
import { Packet } from "../../packages/reticulum-ts/src/packet.js";
import type { CapturedPacket } from "./capture-diff.js";

export function capturePacketFields(label: string, packet: Packet): CapturedPacket {
  return {
    label,
    fields: {
      headerType: packet.headerType,
      contextFlag: packet.contextFlag,
      transportType: packet.transportType,
      destinationType: packet.destinationType,
      packetType: packet.packetType,
      hops: packet.hops,
      destinationHashHex: bytesToHex(packet.destinationHash),
      context: packet.context,
      dataHex: bytesToHex(packet.data),
      rawHex: bytesToHex(packet.raw),
      packetHashHex: bytesToHex(packet.hash())
    }
  };
}

export function captureAnnounceFields(
  label: string,
  packet: Packet,
  parsed: ParsedAnnounce
): CapturedPacket {
  return {
    label,
    fields: {
      ...capturePacketFields(label, packet).fields,
      publicKeyHex: bytesToHex(parsed.publicKey),
      nameHashHex: bytesToHex(parsed.nameHash),
      randomHashHex: bytesToHex(parsed.randomHash),
      ratchetPublicKeyHex:
        parsed.ratchetPublicKey === null ? "" : bytesToHex(parsed.ratchetPublicKey),
      signatureHex: bytesToHex(parsed.signature),
      appDataHex: parsed.appData === null ? "" : bytesToHex(parsed.appData)
    }
  };
}

export function captureAnnounceFromRaw(
  provider: CryptoProvider,
  label: string,
  rawHex: string
): CapturedPacket | null {
  const raw = hexToBytes(rawHex);
  const packet = Packet.decode(provider, raw);
  if (packet === null) {
    return null;
  }

  const parsed = Announce.parse(packet);
  if (parsed === null) {
    return null;
  }

  return captureAnnounceFields(label, packet, parsed);
}

function hexToBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}
