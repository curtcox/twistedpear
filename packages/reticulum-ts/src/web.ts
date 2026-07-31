/**
 * Browser entrypoint for reticulum-ts (Phase W / Workstream B).
 * Excludes Node-only crypto, TCP/UDP runtimes, and the WebSocket gateway server.
 */
export { PureCryptoProvider } from "./crypto/pure.js";
export { webRuntime } from "./runtime/web/runtime.js";
export type { WebIndexedDB, WebRuntimeOptions } from "./runtime/web/runtime.js";
export {
  WebSocketClientInterface,
  WEBSOCKET_HW_MTU,
  WEBSOCKET_INITIAL_CONNECT_TIMEOUT_MS,
  WEBSOCKET_RECONNECT_WAIT_MS
} from "./interfaces/websocket-client.js";
export type {
  WebSocketClientInterfaceOptions,
  WebSocketFactory,
  WebSocketLike,
  WebSocketMessageEvent
} from "./interfaces/websocket-client.js";
export { Reticulum, RETICULUM_MTU } from "./reticulum.js";
export { BandwidthLimiter } from "./transport/bandwidth.js";
export type { BandwidthReservation, BandwidthReservationClass } from "./transport/bandwidth.js";
export type { ByteRateLimiter } from "./transport/bandwidth.js";
export type { ReticulumOptions } from "./reticulum.js";
export { Identity } from "./identity.js";
export { Destination, DestinationDirection, DestinationType } from "./destination.js";
export type { DestinationDirectionValue, DestinationOptions, DestinationTypeValue } from "./destination.js";
export {
  Packet,
  PacketContext,
  PacketContextFlag,
  PacketHeaderType,
  PacketType,
  TransportType
} from "./packet.js";
export type {
  PacketContextFlagValue,
  PacketFields,
  PacketHeaderTypeValue,
  PacketProofOptions,
  PacketTypeValue,
  TransportTypeValue
} from "./packet.js";
export { Announce } from "./announce.js";
export type { AnnounceBuildOptions, ParsedAnnounce } from "./announce.js";
export {
  DestinationAllowPolicy,
  RegisteredDestination,
  DestinationProofStrategy
} from "./registered-destination.js";
export type { RegisteredDestinationOptions, RequestHandler, DestinationAllowPolicyValue } from "./registered-destination.js";
export {
  Link,
  LinkMode,
  LINK_MODE_DEFAULT,
  LinkResourceStrategy,
  LinkStatus,
  LinkTeardownReason
} from "./link.js";
export type {
  InitiatorLinkOptions,
  LinkCallbacks,
  LinkRequestOptions,
  LinkSendContextResult,
  LinkModeValue,
  LinkResourceStrategyValue,
  LinkStatusValue,
  LinkTeardownReasonValue
} from "./link.js";
export { PacketReceipt, PacketReceiptStatus } from "./packet-receipt.js";
export type { PacketReceiptCallbacks, PacketReceiptStatusValue } from "./packet-receipt.js";
export { RawPacketInterface } from "./interfaces/interface.js";
export type { PacketInterface, ReticulumInterfaceOptions } from "./interfaces/interface.js";
export {
  Resource,
  ResourceAdvertisement,
  ResourceStatus
} from "./resource.js";
export type { ResourceCallbacks, ResourceOptions, ResourceStatusValue } from "./resource.js";
export { hashBytes, hexToBytes, bytesToHex, equalBytes } from "./crypto/bytes.js";
export {
  hasWebIdentity,
  loadOrCreateWebIdentity,
  persistWebIdentity,
  resetWebIdentity
} from "./web-identity.js";
export type { WebIdentityOptions, WebIdentityUnlockOptions } from "./web-identity.js";
