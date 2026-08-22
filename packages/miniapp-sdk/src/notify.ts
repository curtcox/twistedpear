import { callHost } from "./rpc.js";
import type { HostNotification } from "@twistedpear/miniapp-runtime";

export interface NotifyPostRequest {
  readonly title: string;
  readonly body: string;
  readonly event: string;
  readonly tag?: string;
}

export async function post(
  request: NotifyPostRequest,
): Promise<HostNotification> {
  return (await callHost(
    "notify",
    "post",
    request,
    "notify:post",
  )) as HostNotification;
}
