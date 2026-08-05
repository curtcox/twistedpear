
export * from "./device-manager/shared.js";
export type * from "./device-manager/shared.js";
import { DeviceManagerLayer3 } from "./device-manager/layer-3.js";
export class DeviceManager extends DeviceManagerLayer3 {}
