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

export interface CompileResult {
  readonly compiled: boolean;
  readonly bytes?: number;
  readonly compiler?: string;
  readonly reason?: string;
  readonly problems?: ReadonlyArray<CompilerProblem>;
}

export interface CompilerProblem {
  readonly path: string;
  readonly title: string;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly message: string;
}

export interface FormatResult {
  readonly formatted: string;
}

export interface DiagnosticsResult {
  readonly problems: ReadonlyArray<CompilerProblem>;
}

export async function compile(projectPrefix: string): Promise<CompileResult> {
  return (await callHost(
    "apps",
    "compile",
    { projectPrefix },
    "apps:package",
  )) as CompileResult;
}

export async function format(content: string): Promise<FormatResult> {
  return (await callHost(
    "apps",
    "format",
    { content },
    "apps:package",
  )) as FormatResult;
}

export async function diagnostics(
  projectPrefix: string,
  path?: string,
): Promise<DiagnosticsResult> {
  return (await callHost(
    "apps",
    "diagnostics",
    path === undefined ? { projectPrefix } : { projectPrefix, path },
    "apps:package",
  )) as DiagnosticsResult;
}

export async function packageProject(
  projectPrefix: string,
  manifest: AppManifestDraft,
): Promise<PackageResult> {
  return (await callHost(
    "apps",
    "package",
    { projectPrefix, manifest },
    "apps:package",
  )) as PackageResult;
}

export async function publish(t256: string): Promise<PublishResult> {
  return (await callHost(
    "apps",
    "publish",
    { t256 },
    "apps:publish",
  )) as PublishResult;
}

export async function install(t256: string): Promise<InstallResult> {
  return (await callHost(
    "apps",
    "install",
    { t256 },
    "apps:install",
  )) as InstallResult;
}

export async function preview(
  projectPrefix: string,
  manifest: AppManifestDraft,
  grants: ReadonlyArray<string>,
): Promise<{ launched: boolean }> {
  return (await callHost(
    "apps",
    "preview",
    { projectPrefix, manifest, grants },
    "apps:preview",
  )) as {
    launched: boolean;
  };
}

export async function stopPreview(): Promise<void> {
  await callHost("apps", "stopPreview", undefined, "apps:preview");
}

export interface ChannelPeer {
  readonly appId: string;
  readonly publisherPublicKey: string;
}

export interface ChannelMessage {
  readonly id: string;
  readonly from: ChannelPeer;
  readonly payload: string;
  readonly sentAt: number;
}

export interface ChannelDestination {
  readonly appId: string;
  readonly publisherPublicKey?: string;
}

async function channelCall<T>(
  method: string,
  payload?: ChannelDestination & { payload?: string },
): Promise<T> {
  return (await callHost("apps.channel", method, payload, "apps:channel")) as T;
}

export const channel = {
  open(destination: ChannelDestination): Promise<{ destination: ChannelPeer }> {
    return channelCall("open", destination);
  },
  send(
    destination: ChannelDestination,
    payload: string,
  ): Promise<{ id: string }> {
    return channelCall("send", { ...destination, payload });
  },
  receive(): Promise<ReadonlyArray<ChannelMessage>> {
    return channelCall("receive");
  },
  onMessage(
    handler: (message: ChannelMessage) => void | Promise<void>,
  ): void {
    const injected = (
      globalThis as {
        sdk?: {
          apps?: {
            channel?: {
              onMessage?: (
                next: (message: ChannelMessage) => void | Promise<void>,
              ) => void;
            };
          };
        };
      }
    ).sdk;
    if (injected?.apps?.channel?.onMessage === undefined) {
      throw new Error(
        "apps.channel.onMessage is only available inside a host sandbox",
      );
    }
    injected.apps.channel.onMessage(handler);
  },
  close(destination: ChannelDestination): Promise<{ closed: true }> {
    return channelCall("close", destination);
  },
  peers(): Promise<ReadonlyArray<ChannelPeer>> {
    return channelCall("peers");
  },
};
