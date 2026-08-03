/**
 * ESM facade over CJS `@freenetorg/freenet-stdlib` for Bare `--linked` packs.
 * Bare does not surface CJS named exports; re-export from the module object.
 */
// @ts-nocheck

import api from "../../node_modules/@freenetorg/freenet-stdlib/dist/src/index.js";

const stdlib = api?.default ?? api;

export const CHUNK_SIZE = stdlib.CHUNK_SIZE;
export const CHUNK_THRESHOLD = stdlib.CHUNK_THRESHOLD;
export const ContractContainer = stdlib.ContractContainer;
export const ContractKey = stdlib.ContractKey;
export const ContractType = stdlib.ContractType;
export const DelegateContainer = stdlib.DelegateContainer;
export const DelegateRequest = stdlib.DelegateRequest;
export const DelegateResponse = stdlib.DelegateResponse;
export const DeltaUpdate = stdlib.DeltaUpdate;
export const DisconnectRequest = stdlib.DisconnectRequest;
export const FreenetWsApi = stdlib.FreenetWsApi;
export const GetRequest = stdlib.GetRequest;
export const GetResponse = stdlib.GetResponse;
export const InboundDelegateMsg = stdlib.InboundDelegateMsg;
export const MAX_CONCURRENT_STREAMS = stdlib.MAX_CONCURRENT_STREAMS;
export const MAX_TOTAL_CHUNKS = stdlib.MAX_TOTAL_CHUNKS;
export const OutboundDelegateMsg = stdlib.OutboundDelegateMsg;
export const PutRequest = stdlib.PutRequest;
export const PutResponse = stdlib.PutResponse;
export const ReassemblyBuffer = stdlib.ReassemblyBuffer;
export const RelatedDeltaUpdate = stdlib.RelatedDeltaUpdate;
export const RelatedStateAndDeltaUpdate = stdlib.RelatedStateAndDeltaUpdate;
export const RelatedStateUpdate = stdlib.RelatedStateUpdate;
export const StateAndDeltaUpdate = stdlib.StateAndDeltaUpdate;
export const StateUpdate = stdlib.StateUpdate;
export const StreamError = stdlib.StreamError;
export const SubscribeRequest = stdlib.SubscribeRequest;
export const UpdateData = stdlib.UpdateData;
export const UpdateDataType = stdlib.UpdateDataType;
export const UpdateNotification = stdlib.UpdateNotification;
export const UpdateRequest = stdlib.UpdateRequest;
export const UpdateResponse = stdlib.UpdateResponse;
export const WasmContractV1 = stdlib.WasmContractV1;
export const WasmDelegateV1 = stdlib.WasmDelegateV1;

export default stdlib;
