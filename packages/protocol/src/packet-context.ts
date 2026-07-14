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

/** Pure link DATA packet context → handler kind. */
export type LinkDataContextKind =
  | "rtt"
  | "keepalive"
  | "close"
  | "identify"
  | "request"
  | "response"
  | "channel"
  | "resource-adv"
  | "resource-req"
  | "resource-hmu"
  | "resource-icl"
  | "resource-rcl"
  | "resource"
  | "plaintext"
  | "ignore";

export function planLinkDataContext(context: number): LinkDataContextKind {
  switch (context) {
    case PacketContextCode.LRRTT:
      return "rtt";
    case PacketContextCode.KEEPALIVE:
      return "keepalive";
    case PacketContextCode.LINKCLOSE:
      return "close";
    case PacketContextCode.LINKIDENTIFY:
      return "identify";
    case PacketContextCode.REQUEST:
      return "request";
    case PacketContextCode.RESPONSE:
      return "response";
    case PacketContextCode.CHANNEL:
      return "channel";
    case PacketContextCode.RESOURCE_ADV:
      return "resource-adv";
    case PacketContextCode.RESOURCE_REQ:
      return "resource-req";
    case PacketContextCode.RESOURCE_HMU:
      return "resource-hmu";
    case PacketContextCode.RESOURCE_ICL:
      return "resource-icl";
    case PacketContextCode.RESOURCE_RCL:
      return "resource-rcl";
    case PacketContextCode.RESOURCE:
      return "resource";
    case PacketContextCode.NONE:
      return "plaintext";
    default:
      return "ignore";
  }
}

/** Whether a packet context byte is the link keepalive context. */
export function isLinkKeepaliveContext(context: number): boolean {
  return context === PacketContextCode.KEEPALIVE;
}
