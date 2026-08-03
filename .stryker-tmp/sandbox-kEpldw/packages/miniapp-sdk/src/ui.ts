// @ts-nocheck
import type { WidgetTree } from "@twistedpear/miniapp-runtime";
import { callHost } from "./rpc.js";

export interface UiEvent {
  readonly nodeId: string;
  readonly event: string;
  readonly value?: unknown;
}

export type UiEventHandler = (event: UiEvent) => void | Promise<void>;

export async function render(tree: WidgetTree): Promise<void> {
  await callHost("ui", "render", { tree });
}

export async function subscribeEvents(handlerId: string): Promise<void> {
  await callHost("ui", "subscribe", { handlerId });
}

/**
 * Register a UI event handler. In the sandbox the host injects `sdk.ui.onEvent`
 * before the bundle runs; this export documents the surface for app authors.
 */
export function onEvent(handler: UiEventHandler): void {
  const injected = (globalThis as { sdk?: { ui?: { onEvent?: (next: UiEventHandler) => void } } }).sdk;
  if (injected?.ui?.onEvent === undefined) {
    throw new Error("ui.onEvent is only available inside a host sandbox");
  }

  injected.ui.onEvent(handler);
}
