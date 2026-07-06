import { callHost } from "./rpc.js";

export const kv = {
  async get(key: string): Promise<Uint8Array | null> {
    return (await callHost("storage.kv", "get", { key }, "storage:kv")) as Uint8Array | null;
  },
  async set(key: string, value: Uint8Array): Promise<void> {
    await callHost("storage.kv", "set", { key, value }, "storage:kv");
  },
  async delete(key: string): Promise<void> {
    await callHost("storage.kv", "delete", { key }, "storage:kv");
  }
};

export async function bee(): Promise<unknown> {
  return callHost("storage.bee", "open", undefined, "storage:hyperbee");
}
