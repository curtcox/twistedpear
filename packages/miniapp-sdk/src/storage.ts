import { callHost } from "./rpc.js";
import type {
  StorageBeeDescriptor,
  StorageBeeEntry,
  StorageBeeListOptions,
} from "@twistedpear/miniapp-runtime";

export const kv = {
  async get(key: string): Promise<Uint8Array | null> {
    return (await callHost(
      "storage.kv",
      "get",
      { key },
      "storage:kv",
    )) as Uint8Array | null;
  },
  async set(key: string, value: Uint8Array): Promise<void> {
    await callHost("storage.kv", "set", { key, value }, "storage:kv");
  },
  async delete(key: string): Promise<void> {
    await callHost("storage.kv", "delete", { key }, "storage:kv");
  },
};

export const bee = {
  async open(): Promise<StorageBeeDescriptor> {
    return (await callHost(
      "storage.bee",
      "open",
      undefined,
      "storage:hyperbee",
    )) as StorageBeeDescriptor;
  },
  async get(key: string): Promise<Uint8Array | null> {
    return (await callHost(
      "storage.bee",
      "get",
      { key },
      "storage:hyperbee",
    )) as Uint8Array | null;
  },
  async put(key: string, value: Uint8Array): Promise<void> {
    await callHost("storage.bee", "put", { key, value }, "storage:hyperbee");
  },
  async del(key: string): Promise<void> {
    await callHost("storage.bee", "del", { key }, "storage:hyperbee");
  },
  async list(
    options?: StorageBeeListOptions,
  ): Promise<ReadonlyArray<StorageBeeEntry>> {
    return (await callHost(
      "storage.bee",
      "list",
      options ?? {},
      "storage:hyperbee",
    )) as ReadonlyArray<StorageBeeEntry>;
  },
};
