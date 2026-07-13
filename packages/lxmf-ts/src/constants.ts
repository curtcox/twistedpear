/** Mirrors LXMF/LXMF.py and LXMF/LXMessage.py constants. */

import {
  LXMF_DESTINATION_LENGTH,
  LXMF_OVERHEAD as PROTOCOL_LXMF_OVERHEAD,
  LXMF_SIGNATURE_LENGTH,
  LXMF_STRUCT_OVERHEAD,
  LXMF_TIMESTAMP_SIZE,
  LxmfDeliveryMethod,
  LxmfDeliveryRepresentation,
  LxmfPeerError,
  type LxmfDeliveryMethodValue,
  type LxmfDeliveryRepresentationValue,
  type LxmfPeerErrorValue
} from "@twistedpear/protocol";

export { LxmfMessageState as LXMessageState, type LxmfMessageStateValue as LXMessageStateValue } from "@twistedpear/protocol";

export const APP_NAME = "lxmf";

export const LXMessageRepresentation = LxmfDeliveryRepresentation;
export type LXMessageRepresentationValue = LxmfDeliveryRepresentationValue;

export const LXMessageMethod = LxmfDeliveryMethod;
export type LXMessageMethodValue = LxmfDeliveryMethodValue;

export const LXMessageUnverifiedReason = {
  SOURCE_UNKNOWN: 0x01,
  SIGNATURE_INVALID: 0x02
} as const;

export type LXMessageUnverifiedReasonValue =
  (typeof LXMessageUnverifiedReason)[keyof typeof LXMessageUnverifiedReason];

/** Mirrors LXMF/LXMessage.py size constants. */
export const DESTINATION_LENGTH = LXMF_DESTINATION_LENGTH;
export const SIGNATURE_LENGTH = LXMF_SIGNATURE_LENGTH;
export const TIMESTAMP_SIZE = LXMF_TIMESTAMP_SIZE;
export const STRUCT_OVERHEAD = LXMF_STRUCT_OVERHEAD;
export const LXMF_OVERHEAD = PROTOCOL_LXMF_OVERHEAD;

/** Mirrors LXMF/LXMPeer.py request paths. */
export const MESSAGE_GET_PATH = "/get";
export const OFFER_REQUEST_PATH = "/offer";

/** Mirrors LXMF/LXMPeer.py error codes. */
export const PeerError = LxmfPeerError;
export type PeerErrorValue = LxmfPeerErrorValue;

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
