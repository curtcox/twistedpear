// @ts-nocheck
import { callHost } from "./rpc.js";
import type { AnnounceEvent } from "@twistedpear/miniapp-runtime";

export async function publish(appData?: Uint8Array, namespace?: string): Promise<void> {
  await callHost("announce", "publish", { appData, namespace }, "announce:publish");
}

export async function subscribe(namespace?: string): Promise<ReadonlyArray<AnnounceEvent>> {
  return (await callHost(
    "announce",
    "subscribe",
    { namespace },
    "announce:subscribe"
  )) as ReadonlyArray<AnnounceEvent>;
}
