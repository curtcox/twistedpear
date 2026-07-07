import { callHost } from "./rpc.js";

export interface WorkspaceFileInfo {
  readonly path: string;
  readonly size: number;
}

export async function list(prefix?: string): Promise<ReadonlyArray<WorkspaceFileInfo>> {
  return (await callHost("workspace", "list", { prefix }, "workspace")) as ReadonlyArray<WorkspaceFileInfo>;
}

export async function read(path: string): Promise<string> {
  const result = (await callHost("workspace", "read", { path }, "workspace")) as { content: string };
  return result.content;
}

export async function write(path: string, content: string): Promise<WorkspaceFileInfo> {
  return (await callHost("workspace", "write", { path, content }, "workspace")) as WorkspaceFileInfo;
}

export async function remove(path: string): Promise<void> {
  await callHost("workspace", "delete", { path }, "workspace");
}
