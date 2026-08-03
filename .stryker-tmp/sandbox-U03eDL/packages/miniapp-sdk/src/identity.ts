// @ts-nocheck
import { callHost } from "./rpc.js";

export async function destinationHash(): Promise<string> {
  return (await callHost("identity", "destinationHash", undefined, "identity")) as string;
}

export async function sign(payload: Uint8Array): Promise<Uint8Array> {
  return (await callHost("identity", "sign", { payload }, "identity")) as Uint8Array;
}
