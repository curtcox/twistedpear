import { callHost } from "./rpc.js";

export async function publish(appData?: Uint8Array, namespace?: string): Promise<void> {
  await callHost("announce", "publish", { appData, namespace }, "announce:publish");
}

export async function subscribe(namespace: string): Promise<unknown> {
  return callHost("announce", "subscribe", { namespace }, "announce:subscribe");
}
