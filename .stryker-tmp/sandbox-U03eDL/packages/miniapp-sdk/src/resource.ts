// @ts-nocheck
import type { ResourceFetchRequest } from "@twistedpear/miniapp-runtime";
import { callHost } from "./rpc.js";

export async function fetch(request: ResourceFetchRequest): Promise<Uint8Array> {
  return (await callHost("resource", "fetch", request, "resource:fetch")) as Uint8Array;
}
