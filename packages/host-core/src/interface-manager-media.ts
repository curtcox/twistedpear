import {
  bytesToHex,
  type CryptoProvider,
  type PacketInterface,
} from "@twistedpear/reticulum-ts";
import {
  AcousticInterface,
  DEFAULT_INTERFACE_BITRATES,
  OpticalInterface,
  type AcousticChannel,
  type OpticalChannel,
} from "@twistedpear/reticulum-interfaces";
import type {
  AcousticInterfaceConfig,
  NtfyInterfaceConfig,
  OpticalInterfaceConfig,
} from "./types.js";
import { NtfyPacketInterface } from "./ntfy-interface.js";

export function openOpticalInterface(
  provider: CryptoProvider,
  channel: OpticalChannel,
  config: OpticalInterfaceConfig,
  incoming: boolean,
  outgoing: boolean,
): Promise<PacketInterface> {
  return OpticalInterface.open(provider, {
    name: "host-optical",
    provider,
    channel,
    ...(config.bitrateHint === undefined
      ? {}
      : { bitrate: config.bitrateHint }),
    incoming,
    outgoing,
  });
}

export function openAcousticInterface(
  provider: CryptoProvider,
  channel: AcousticChannel,
  config: AcousticInterfaceConfig,
  incoming: boolean,
  outgoing: boolean,
): Promise<PacketInterface> {
  return AcousticInterface.open(provider, {
    name: "host-acoustic",
    provider,
    channel,
    ...(config.band === undefined ? {} : { band: config.band }),
    ...(config.bitrateHint === undefined
      ? {}
      : { bitrate: config.bitrateHint }),
    incoming,
    outgoing,
  });
}

export async function openNtfyInterface(
  provider: CryptoProvider,
  config: NtfyInterfaceConfig,
  incoming: boolean,
  outgoing: boolean,
): Promise<PacketInterface> {
  const iface = new NtfyPacketInterface(provider, {
    name: "host-ntfy",
    provider,
    baseUrl: config.baseUrl ?? "https://ntfy.sh",
    topic: config.topic ?? bytesToHex(provider.randomBytes(8)),
    secret: config.secret ?? bytesToHex(provider.randomBytes(16)),
    ...(config.bearerToken === undefined
      ? {}
      : { bearerToken: config.bearerToken }),
    ...(config.pollIntervalMs === undefined
      ? {}
      : { pollIntervalMs: config.pollIntervalMs }),
    incoming,
    outgoing,
    bitrate: config.bitrateHint ?? DEFAULT_INTERFACE_BITRATES.ntfy ?? 10_000,
  });
  await iface.start();
  return iface;
}
