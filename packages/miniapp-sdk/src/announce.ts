import { callHost } from "./rpc.js";
import type { AnnounceEvent } from "@twistedpear/miniapp-runtime";

export async function publish(
  appData?: Uint8Array,
  namespace?: string,
): Promise<void> {
  await callHost(
    "announce",
    "publish",
    { appData, namespace },
    "announce:publish",
  );
}

export async function subscribe(
  namespace?: string,
): Promise<ReadonlyArray<AnnounceEvent>> {
  return (await callHost(
    "announce",
    "subscribe",
    { namespace },
    "announce:subscribe",
  )) as ReadonlyArray<AnnounceEvent>;
}

export function onEvent(
  handler: (event: AnnounceEvent) => void | Promise<void>,
): void {
  const injected = (
    globalThis as {
      sdk?: {
        announce?: {
          onEvent?: (
            next: (event: AnnounceEvent) => void | Promise<void>,
          ) => void;
        };
      };
    }
  ).sdk;
  if (injected?.announce?.onEvent === undefined) {
    throw new Error("announce.onEvent is only available inside a host sandbox");
  }
  injected.announce.onEvent(handler);
}
