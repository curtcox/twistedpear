import type {
  LxmfDelivery,
  LxmfInboxMessage,
  LxmfSendRequest,
} from "@twistedpear/miniapp-runtime";
import { callHost } from "./rpc.js";

export async function send(request: LxmfSendRequest): Promise<LxmfDelivery> {
  return (await callHost("lxmf", "send", request, "lxmf:send")) as LxmfDelivery;
}

export async function receive(): Promise<ReadonlyArray<LxmfInboxMessage>> {
  return (await callHost(
    "lxmf",
    "receive",
    undefined,
    "lxmf:receive",
  )) as ReadonlyArray<LxmfInboxMessage>;
}
