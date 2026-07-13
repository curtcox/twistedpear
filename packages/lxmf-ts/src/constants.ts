/** Mirrors LXMF/LXMF.py and LXMF/LXMessage.py constants. */

export { LxmfMessageState as LXMessageState, type LxmfMessageStateValue as LXMessageStateValue } from "@twistedpear/protocol";

export const APP_NAME = "lxmf";

export const LXMessageRepresentation = {
  UNKNOWN: 0x00,
  PACKET: 0x01,
  RESOURCE: 0x02
} as const;

export type LXMessageRepresentationValue =
  (typeof LXMessageRepresentation)[keyof typeof LXMessageRepresentation];

export const LXMessageMethod = {
  OPPORTUNISTIC: 0x01,
  DIRECT: 0x02,
  PROPAGATED: 0x03,
  PAPER: 0x05
} as const;

export type LXMessageMethodValue = (typeof LXMessageMethod)[keyof typeof LXMessageMethod];

export const LXMessageUnverifiedReason = {
  SOURCE_UNKNOWN: 0x01,
  SIGNATURE_INVALID: 0x02
} as const;

export type LXMessageUnverifiedReasonValue =
  (typeof LXMessageUnverifiedReason)[keyof typeof LXMessageUnverifiedReason];

/** Mirrors LXMF/LXMessage.py size constants. */
export const DESTINATION_LENGTH = 16;
export const SIGNATURE_LENGTH = 64;
export const TIMESTAMP_SIZE = 8;
export const STRUCT_OVERHEAD = 8;
export const LXMF_OVERHEAD =
  2 * DESTINATION_LENGTH + SIGNATURE_LENGTH + TIMESTAMP_SIZE + STRUCT_OVERHEAD;

/** Mirrors LXMF/LXMPeer.py request paths. */
export const MESSAGE_GET_PATH = "/get";
export const OFFER_REQUEST_PATH = "/offer";

/** Mirrors LXMF/LXMPeer.py error codes. */
export const PeerError = {
  NO_IDENTITY: 0xf0,
  NO_ACCESS: 0xf1,
  TIMEOUT: 0xfe
} as const;

/** Mirrors LXMF/LXMRouter.py propagation transfer states. */
export {
  PropagationTransferState,
  type PropagationTransferStateValue
} from "@twistedpear/protocol";

/** Core LXMF field identifiers from LXMF/LXMF.py. */
export const Field = {
  EMBEDDED_LXMS: 0x01,
  TELEMETRY: 0x02,
  TELEMETRY_STREAM: 0x03,
  ICON_APPEARANCE: 0x04,
  FILE_ATTACHMENTS: 0x05,
  IMAGE: 0x06,
  AUDIO: 0x07,
  THREAD: 0x08,
  COMMANDS: 0x09,
  RESULTS: 0x0a,
  GROUP: 0x0b,
  TICKET: 0x0c,
  EVENT: 0x0d,
  RNR_REFS: 0x0e,
  RENDERER: 0x0f,
  CUSTOM_TYPE: 0xfb,
  CUSTOM_DATA: 0xfc,
  CUSTOM_META: 0xfd,
  NON_SPECIFIC: 0xfe,
  DEBUG: 0xff
} as const;

export type FieldValue = (typeof Field)[keyof typeof Field];

export type LXMessageFields = Readonly<Record<number, Uint8Array>>;
