import { callHost } from "./rpc.js";

export interface CasPutResult {
  readonly t256: string;
  readonly size: number;
}

export async function put(content: string): Promise<CasPutResult> {
  return (await callHost(
    "share.cas",
    "put",
    { content },
    "share:cas",
  )) as CasPutResult;
}

export async function get(t256: string): Promise<string | null> {
  const result = (await callHost(
    "share.cas",
    "get",
    { t256 },
    "share:cas",
  )) as { content: string | null };
  return result.content;
}
