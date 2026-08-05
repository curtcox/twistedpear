/** Mirrors LXMF/LXMF.py and LXMF/LXMessage.py constants. */

import {
  LXMF_APP_NAME,
  LXMF_DESTINATION_LENGTH,
  LXMF_MESSAGE_GET_PATH,
  LXMF_OFFER_REQUEST_PATH,
  LXMF_OVERHEAD as PROTOCOL_LXMF_OVERHEAD,
  LXMF_SIGNATURE_LENGTH,
  LXMF_STRUCT_OVERHEAD,
  LXMF_TIMESTAMP_SIZE,
  LxmfDeliveryMethod,
  LxmfDeliveryRepresentation,
  LxmfField,
  LxmfPeerError,
  LxmfUnverifiedReason,
  type LxmfDeliveryMethodValue,
  type LxmfDeliveryRepresentationValue,
  type LxmfFieldValue,
  type LxmfMessageFields,
  type LxmfPeerErrorValue,
  type LxmfUnverifiedReasonValue,
} from "@twistedpear/protocol";

export {
  LxmfMessageState as LXMessageState,
  type LxmfMessageStateValue as LXMessageStateValue,
} from "@twistedpear/protocol";

export const APP_NAME = LXMF_APP_NAME;

export const LXMessageRepresentation = LxmfDeliveryRepresentation;
export type LXMessageRepresentationValue = LxmfDeliveryRepresentationValue;

export const LXMessageMethod = LxmfDeliveryMethod;
export type LXMessageMethodValue = LxmfDeliveryMethodValue;

export const LXMessageUnverifiedReason = LxmfUnverifiedReason;
export type LXMessageUnverifiedReasonValue = LxmfUnverifiedReasonValue;

/** Mirrors LXMF/LXMessage.py size constants. */
export const DESTINATION_LENGTH = LXMF_DESTINATION_LENGTH;
export const SIGNATURE_LENGTH = LXMF_SIGNATURE_LENGTH;
export const TIMESTAMP_SIZE = LXMF_TIMESTAMP_SIZE;
export const STRUCT_OVERHEAD = LXMF_STRUCT_OVERHEAD;
export const LXMF_OVERHEAD = PROTOCOL_LXMF_OVERHEAD;

/** Mirrors LXMF/LXMPeer.py request paths. */
export const MESSAGE_GET_PATH = LXMF_MESSAGE_GET_PATH;
export const OFFER_REQUEST_PATH = LXMF_OFFER_REQUEST_PATH;

/** Mirrors LXMF/LXMPeer.py error codes. */
export const PeerError = LxmfPeerError;
export type PeerErrorValue = LxmfPeerErrorValue;

/** Mirrors LXMF/LXMRouter.py propagation transfer states. */
export {
  PropagationTransferState,
  type PropagationTransferStateValue,
} from "@twistedpear/protocol";

/** Core LXMF field identifiers from LXMF/LXMF.py. */
export const Field = LxmfField;
export type FieldValue = LxmfFieldValue;

export type LXMessageFields = LxmfMessageFields;
