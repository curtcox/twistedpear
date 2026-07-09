export type {
  BlePipe,
  BlePipeEvents,
  MulticastBridge,
  MulticastBridgeEvents,
  MulticastNetworkInfo,
  PipeStats,
  SerialPipe,
  SerialPipeEvents
} from "./pipes.js";

export {
  BONJOUR_RETICULUM_SERVICE,
  MulticastDiscoveryProvider,
  selectDiscoveryProviders,
  type DiscoveryPeer,
  type DiscoveryProvider,
  type DiscoveryProviderEvents,
  type DiscoveryProviderKind,
  type DiscoverySelection
} from "./auto-discovery.js";

export {
  BonjourDiscoveryProvider,
  serviceRecordToPeer,
  type BonjourBridge,
  type BonjourBridgeEvents,
  type BonjourServiceRecord
} from "./bonjour.js";

export {
  AUTO_ANNOUNCE_INTERVAL_MS,
  AUTO_BITRATE_GUESS,
  AUTO_DEFAULT_DATA_PORT,
  AUTO_DEFAULT_DISCOVERY_PORT,
  AUTO_DEFAULT_GROUP_ID,
  AUTO_HW_MTU,
  AUTO_PEERING_TIMEOUT_MS,
  type AutoInterfaceOptions,
  type AutoInterfacePeerHandle
} from "./auto-common.js";
export { AutoInterface } from "./auto.js";

export {
  AutoInterfaceBridge,
  type AutoInterfaceBridgeOptions
} from "./auto-bridge.js";

export {
  BLE_DEFAULT_PIPE_MTU,
  BLE_FLAG_ACK_REQ,
  BLE_FLAG_IDENTITY,
  BLE_FLAG_KEEPALIVE,
  BLE_FLAG_MORE,
  BLE_FRAME_HEADER_SIZE,
  createBleReassemblyState,
  decodeBleFrameHeader,
  encodeBleFrame,
  fragmentForMtu,
  reassembleBleFrames,
  type BleFrameHeader,
  type BleReassemblyState
} from "./ble/spec-framing.js";
export { BleInterface, BLE_INTERFACE_MTU, type BleInterfaceOptions } from "./ble/interface.js";
export { SimulatedBlePipe, type SimulatedBlePipeOptions } from "./ble/sim.js";

export {
  KISS_CMD_DATA,
  KISS_CMD_DETECT,
  KISS_CMD_FREQUENCY,
  KISS_CMD_FW_VERSION,
  KISS_CMD_PLATFORM,
  KISS_CMD_RADIO_STATE,
  KISS_DETECT_REQ,
  KISS_DETECT_RESP,
  KISS_FEND,
  KISS_RADIO_STATE_ON,
  createKissDecodeState,
  decodeKissFrames,
  encodeDetectRequest,
  encodeFrequencyCommand,
  encodeKissFrame,
  encodeRadioStateAsk,
  kissEscape,
  parseFirmwareVersion,
  type KissDecodeState,
  type KissFrame
} from "./rnode/kiss.js";
export {
  RNODE_INTERFACE_MTU,
  RNODE_RECONNECT_WAIT_MS,
  RNodeInterface,
  type RNodeInterfaceOptions,
  type RNodeStatus
} from "./rnode/interface.js";

export {
  I2P_DEFAULT_SAM_HOST,
  I2P_DEFAULT_SAM_PORT,
  I2P_RECONNECT_WAIT_MS,
  I2PInterface,
  SamClient,
  type I2PInterfaceOptions,
  type SamClientOptions,
  type SamSessionInfo
} from "./i2p.js";

export {
  DEFAULT_INTERFACE_BITRATES,
  DEFAULT_INTERFACE_PRIORITY,
  InterfaceKind,
  inferInterfaceKind,
  rankOutgoingInterfaces,
  selectPreferredInterface,
  type InterfaceKindValue,
  type InterfacePolicyOptions,
  type RankedInterface
} from "./policy.js";
