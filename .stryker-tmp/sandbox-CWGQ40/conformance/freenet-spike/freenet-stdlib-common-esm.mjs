/**
 * ESM facade over CJS `@freenetorg/freenet-stdlib/common` for Bare `--linked` packs.
 */
// @ts-nocheck

import api from "../../node_modules/@freenetorg/freenet-stdlib/dist/src/common.js";

const common = api?.default ?? api;

export const ApplicationMessage = common.ApplicationMessage;
export const ApplicationMessageT = common.ApplicationMessageT;
export const ContractCode = common.ContractCode;
export const ContractCodeT = common.ContractCodeT;
export const ContractContainer = common.ContractContainer;
export const ContractContainerT = common.ContractContainerT;
export const ContractInstanceId = common.ContractInstanceId;
export const ContractInstanceIdT = common.ContractInstanceIdT;
export const ContractKey = common.ContractKey;
export const ContractKeyT = common.ContractKeyT;
export const ContractType = common.ContractType;
export const DeltaUpdate = common.DeltaUpdate;
export const DeltaUpdateT = common.DeltaUpdateT;
export const RelatedDeltaUpdate = common.RelatedDeltaUpdate;
export const RelatedDeltaUpdateT = common.RelatedDeltaUpdateT;
export const RelatedStateAndDeltaUpdate = common.RelatedStateAndDeltaUpdate;
export const RelatedStateAndDeltaUpdateT = common.RelatedStateAndDeltaUpdateT;
export const RelatedStateUpdate = common.RelatedStateUpdate;
export const RelatedStateUpdateT = common.RelatedStateUpdateT;
export const SecretsId = common.SecretsId;
export const SecretsIdT = common.SecretsIdT;
export const StateAndDeltaUpdate = common.StateAndDeltaUpdate;
export const StateAndDeltaUpdateT = common.StateAndDeltaUpdateT;
export const StateUpdate = common.StateUpdate;
export const StateUpdateT = common.StateUpdateT;
export const UpdateData = common.UpdateData;
export const UpdateDataT = common.UpdateDataT;
export const UpdateDataType = common.UpdateDataType;
export const WasmContractV1 = common.WasmContractV1;
export const WasmContractV1T = common.WasmContractV1T;

export default common;
