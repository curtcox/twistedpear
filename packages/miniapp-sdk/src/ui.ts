import type { WidgetTree } from "@twistedpear/miniapp-runtime";
import { callHost } from "./rpc.js";

export async function render(tree: WidgetTree): Promise<void> {
  await callHost("ui", "render", { tree });
}

export async function subscribeEvents(handlerId: string): Promise<void> {
  await callHost("ui", "subscribe", { handlerId });
}
