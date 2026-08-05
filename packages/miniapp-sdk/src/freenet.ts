import { callHost } from "./rpc.js";

export interface FreenetContractRecord {
  readonly keyHex: string;
  readonly stateHex: string;
}

export async function get(
  keyHex: string,
): Promise<FreenetContractRecord | null> {
  return (await callHost(
    "freenet",
    "get",
    { keyHex },
    "freenet:contract",
  )) as FreenetContractRecord | null;
}

export async function put(options: {
  readonly wasmHex: string;
  readonly parametersHex: string;
  readonly stateHex: string;
}): Promise<{ keyHex: string }> {
  return (await callHost("freenet", "put", options, "freenet:contract")) as {
    keyHex: string;
  };
}

export async function update(options: {
  readonly keyHex: string;
  readonly codeHashHex: string;
  readonly stateHex: string;
}): Promise<void> {
  await callHost("freenet", "update", options, "freenet:contract");
}
