// @ts-nocheck
import type { PresenceSnapshot } from "@twistedpear/miniapp-runtime";
import { callHost } from "./rpc.js";

export async function snapshot(): Promise<PresenceSnapshot> {
  return (await callHost("presence", "snapshot", undefined, "presence")) as PresenceSnapshot;
}
