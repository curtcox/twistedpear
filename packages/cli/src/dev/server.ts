import { createServer, type Server, type Socket } from "node:net";
import { watch } from "node:fs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bytesToHex } from "@twistedpear/reticulum-ts";
import { prepareBundleSource } from "@twistedpear/miniapp-runtime";

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
}

export interface DevServerHandle {
  readonly url: string;
  close(): Promise<void>;
}

function readBundle(appDir: string, entry: string): Uint8Array {
  const source = readFileSync(join(appDir, entry), "utf8");
  return new TextEncoder().encode(prepareBundleSource(source));
}

function pushBundle(socket: Socket, options: DevServerOptions): void {
  const bundle = readBundle(options.appDir, options.manifest.entry);
  const payload = {
    type: "dev-bundle",
    manifest: options.manifest,
    bundleHex: bytesToHex(bundle)
  };
  socket.write(`${JSON.stringify(payload)}\n`);
}

export async function startDevServer(options: DevServerOptions): Promise<DevServerHandle> {
  let activeSocket: Socket | null = null;
  const server: Server = createServer((socket) => {
    activeSocket = socket;
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

  const watcher = watch(options.appDir, { recursive: false }, () => {
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
    }
  };
}
