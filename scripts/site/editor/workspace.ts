import type { MiniappHost } from "../../../packages/miniapp-runtime/src/host";
import type { WorkspaceFileMap } from "./share.ts";

export const DEVSTUDIO_APP_ID = "devstudio";
export const DEVSTUDIO_PUBLISHER = "pages-editor-demo";

export async function readAllWorkspace(
  host: MiniappHost,
  appId = DEVSTUDIO_APP_ID,
): Promise<WorkspaceFileMap> {
  const infos = await host.workspace.list(appId);
  const files: WorkspaceFileMap = {};
  for (const info of infos) {
    files[info.path] = await host.workspace.read(appId, info.path);
  }
  return files;
}

export async function writeAllWorkspace(
  host: MiniappHost,
  files: WorkspaceFileMap,
  appId = DEVSTUDIO_APP_ID,
): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    await host.workspace.write(appId, path, content);
  }
}

export async function workspaceHasFiles(
  host: MiniappHost,
  appId = DEVSTUDIO_APP_ID,
): Promise<boolean> {
  const infos = await host.workspace.list(appId);
  return infos.length > 0;
}
