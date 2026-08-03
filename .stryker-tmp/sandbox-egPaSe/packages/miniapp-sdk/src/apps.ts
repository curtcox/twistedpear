// @ts-nocheck
import { callHost } from "./rpc.js";

export interface AppManifestDraft {
  readonly name: string;
  readonly version: string;
  readonly entry: string;
  readonly capabilities: ReadonlyArray<string>;
  readonly minHostApi?: string;
}

export interface PackageResult {
  readonly packageHash: string;
  readonly size: number;
  readonly t256: string;
}

export interface PublishResult {
  readonly t256: string;
  readonly driveKey: string;
  readonly version: string;
}

export interface InstallResult {
  readonly appId: string;
  readonly version: string;
  readonly trusted: boolean;
}

export async function packageProject(projectPrefix: string, manifest: AppManifestDraft): Promise<PackageResult> {
  return (await callHost("apps", "package", { projectPrefix, manifest }, "apps:package")) as PackageResult;
}

export async function publish(t256: string): Promise<PublishResult> {
  return (await callHost("apps", "publish", { t256 }, "apps:publish")) as PublishResult;
}

export async function install(t256: string): Promise<InstallResult> {
  return (await callHost("apps", "install", { t256 }, "apps:install")) as InstallResult;
}

export async function preview(projectPrefix: string, manifest: AppManifestDraft, grants: ReadonlyArray<string>): Promise<{ launched: boolean }> {
  return (await callHost("apps", "preview", { projectPrefix, manifest, grants }, "apps:preview")) as {
    launched: boolean;
  };
}

export async function stopPreview(): Promise<void> {
  await callHost("apps", "stopPreview", undefined, "apps:preview");
}
