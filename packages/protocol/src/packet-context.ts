/**
 * Pure RNS packet context byte constants.
 * Packet construction stays at the adapter edge.
 */

export const PacketContextCode = {
  NONE: 0x00,
  RESOURCE: 0x01,
  RESOURCE_ADV: 0x02,
  RESOURCE_REQ: 0x03,
  RESOURCE_HMU: 0x04,
  RESOURCE_PRF: 0x05,
  RESOURCE_ICL: 0x06,
  RESOURCE_RCL: 0x07,
  CACHE_REQUEST: 0x08,
  REQUEST: 0x09,
  RESPONSE: 0x0a,
  PATH_RESPONSE: 0x0b,
  COMMAND: 0x0c,
  COMMAND_STATUS: 0x0d,
  CHANNEL: 0x0e,
  KEEPALIVE: 0xfa,
  LINKIDENTIFY: 0xfb,
  LINKCLOSE: 0xfc,
  LINKPROOF: 0xfd,
  LRRTT: 0xfe,
  LRPROOF: 0xff
} as const;

export type PacketContextCodeValue =
  (typeof PacketContextCode)[keyof typeof PacketContextCode];

/** Keep transport-announce aliases aligned with PacketContextCode. */
export const PACKET_CONTEXT_NONE = PacketContextCode.NONE;
export const PACKET_CONTEXT_PATH_RESPONSE = PacketContextCode.PATH_RESPONSE;
