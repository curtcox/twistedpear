import { createServer, type Server, type Socket } from "node:net";
import { watch } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bytesToHex } from "@twistedpear/reticulum-ts";
import { prepareBundleSource } from "@twistedpear/miniapp-runtime";
import type { LinkProfile } from "@twistedpear/miniapp-test";

export interface DevServerOptions {
  readonly appDir: string;
  readonly host: string;
  readonly port: number;
  readonly manifest: {
    readonly name: string;
    readonly version: string;
    readonly entry: string;
    readonly capabilities: ReadonlyArray<string>;
    readonly publisherPublicKey: string;
    readonly minHostApi: string;
  };
  readonly link?: LinkProfile;
  readonly onClientMessage?: (payload: unknown) => void;
  readonly log?: (line: string) => void;
}

export interface DevServerHandle {
  readonly url: string;
  close(): Promise<void>;
}

function readBundle(appDir: string, entry: string): Uint8Array {
  const source = readFileSync(join(appDir, entry), "utf8");
  return new TextEncoder().encode(prepareBundleSource(source));
}

function bundlePushLine(options: DevServerOptions): string {
  const bundle = readBundle(options.appDir, options.manifest.entry);
  const payload = {
    type: "dev-bundle",
    manifest: {
      ...options.manifest,
      ...(options.link === undefined ? {} : { link: options.link }),
    },
    bundleHex: bytesToHex(bundle),
  };
  return `${JSON.stringify(payload)}\n`;
}

function linkDelayMs(link: LinkProfile | undefined, line: string): number {
  const serializeMs =
    link === undefined
      ? 0
      : (Buffer.byteLength(line) * 8 * 1000) / link.bitrate;
  return (link?.latencyMs ?? 0) + serializeMs;
}

function writeWithDelay(socket: Socket, line: string, delay: number): void {
  if (delay <= 0) {
    socket.write(line);
    return;
  }
  setTimeout(() => {
    if (!socket.destroyed) socket.write(line);
  }, delay);
}

function pushBundle(socket: Socket, options: DevServerOptions): void {
  if (options.link?.peerOffline === true) {
    return;
  }
  const line = bundlePushLine(options);
  if (options.link !== undefined && options.link.loss > 0) {
    if (Math.random() < options.link.loss) return;
  }
  writeWithDelay(socket, line, linkDelayMs(options.link, line));
}

function formatClientLine(payload: {
  readonly type?: string;
  readonly level?: string;
  readonly message?: string;
  readonly phase?: string;
}): string | null {
  if (payload.type === "app-log") {
    return `[app] ${payload.level ?? "log"}: ${payload.message ?? ""}`;
  }
  if (payload.type === "app-error") {
    return `[app-error] ${payload.phase ?? "bundle"}: ${payload.message ?? ""}`;
  }
  return null;
}

function attachClientReader(socket: Socket, options: DevServerOptions): void {
  let inbound = "";
  const log = options.log ?? ((line: string) => console.log(line));
  socket.on("data", (chunk) => {
    inbound += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    let newline = inbound.indexOf("\n");
    while (newline >= 0) {
      const line = inbound.slice(0, newline);
      inbound = inbound.slice(newline + 1);
      if (line.length > 0) {
        try {
          const payload: unknown = JSON.parse(line);
          options.onClientMessage?.(payload);
          const formatted = formatClientLine(
            payload as {
              type?: string;
              level?: string;
              message?: string;
              phase?: string;
            },
          );
          if (formatted !== null) log(formatted);
        } catch {
          // Host chrome may send non-JSON; ignore.
        }
      }
      newline = inbound.indexOf("\n");
    }
  });
}

export async function startDevServer(
  options: DevServerOptions,
): Promise<DevServerHandle> {
  let activeSocket: Socket | null = null;
  const server: Server = createServer((socket) => {
    activeSocket = socket;
    attachClientReader(socket, options);
    pushBundle(socket, options);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => resolve());
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Dev server failed to bind");
  }

  const boundPort = address.port;

  const entryPath = join(options.appDir, options.manifest.entry);
  const watcher = watch(entryPath, () => {
    if (activeSocket !== null && !activeSocket.destroyed) {
      pushBundle(activeSocket, options);
      console.log("Hot reload: pushed updated bundle");
    }
  });

  const url = `${options.host}:${boundPort}`;
  console.log(`Dev server listening on ${url}`);

  return {
    url,
    async close() {
      watcher.close();
      activeSocket?.destroy();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
