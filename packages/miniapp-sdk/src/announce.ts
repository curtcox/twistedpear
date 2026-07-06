import { callHost } from "./rpc.js";

export async function publish(appData?: Uint8Array): Promise<void> {
  await callHost("announce", "publish", { appData }, "announce:publish");
}

export async function subscribe(namespace: string): Promise<void> {
  await callHost("announce", "subscribe", { namespace }, "announce:subscribe");
}
