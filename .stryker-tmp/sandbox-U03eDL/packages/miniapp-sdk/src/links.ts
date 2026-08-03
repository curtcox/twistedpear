// @ts-nocheck
import type {
  LinkProbeOptions,
  LinkQuality,
  LinkWatchBatch,
  PeerLinkEvent,
  PeerLinkSummary
} from "@twistedpear/miniapp-runtime";
import type { PeerHandle } from "./peers.js";
import { callHost, MiniappHostError } from "./rpc.js";

export class LinkError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "LinkError";
  }
}

async function linkCall<T>(method: string, payload: unknown, capability: "link:observe" | "link:probe"): Promise<T> {
  try {
    return await callHost("links", method, payload, capability) as T;
  } catch (error) {
    if (error instanceof MiniappHostError) throw new LinkError(error.code, error.message);
    throw error;
  }
}

export function peers(): Promise<ReadonlyArray<PeerLinkSummary>> {
  return linkCall("peers", {}, "link:observe");
}

export async function *watch(): AsyncIterable<PeerLinkEvent> {
  let cursor: string | undefined;
  while (true) {
    const batch = await linkCall<LinkWatchBatch>("watch", { cursor }, "link:observe");
    cursor = batch.cursor;
    for (const event of batch.events) yield event;
  }
}

export function probe(peer: PeerHandle, options?: LinkProbeOptions): Promise<LinkQuality> {
  return linkCall("probe", { peer, options }, "link:probe");
}

export type { LinkQuality, LinkProbeOptions, PeerLinkEvent, PeerLinkSummary };
