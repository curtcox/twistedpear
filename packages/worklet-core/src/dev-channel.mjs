/**
 * Local TCP dev side-load channel (Phase 4 M6).
 * Connects to `tp dev` and forwards dev-bundle payloads to the mini-app host.
 */

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

export function createDevChannelClient(options) {
  let socket = null;
  let buffer = "";
  let connecting = false;

  async function loadTcp() {
    return import("bare-tcp");
  }

  async function connect(host, port) {
    if (!options.isDeveloperMode()) {
      throw new Error("Developer mode is disabled");
    }

    if (connecting) {
      return;
    }

    await disconnect();
    connecting = true;

    try {
      const tcp = await loadTcp();
      const nextSocket = new tcp.Socket({ eagerOpen: true });
      socket = nextSocket;

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          nextSocket.destroy();
          reject(new Error("Dev channel connect timed out"));
        }, 5_000);

        nextSocket.once("connect", () => {
          clearTimeout(timer);
          resolve();
        });

        nextSocket.once("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });

        nextSocket.connect(port, host);
      });

      nextSocket.on("data", (chunk) => {
        buffer += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
        const newline = buffer.indexOf("\n");
        if (newline < 0) {
          return;
        }

        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        handleLine(line);
      });

      nextSocket.on("close", () => {
        options.onDisconnected?.();
      });

      options.onConnected?.(`${host}:${port}`);
    } finally {
      connecting = false;
    }
  }

  function handleLine(line) {
    let payload;
    try {
      payload = JSON.parse(line);
    } catch {
      options.onError?.("Invalid dev channel payload");
      return;
    }

    if (payload.type !== "dev-bundle" || typeof payload.bundleHex !== "string") {
      options.onError?.("Unexpected dev channel message");
      return;
    }

    void options
      .onBundle(payload.manifest ?? {}, hexToBytes(payload.bundleHex))
      .then(() => options.onBundleLoaded?.(payload.manifest?.name ?? "mini-app"))
      .catch((error) => options.onError?.(error instanceof Error ? error.message : String(error)));
  }

  async function disconnect() {
    if (socket === null) {
      return;
    }

    const current = socket;
    socket = null;
    buffer = "";
    await new Promise((resolve) => {
      current.end(() => resolve());
      current.destroy();
    });
  }

  return {
    connect,
    disconnect,
    isConnected() {
      return socket !== null && !socket.destroyed;
    }
  };
}
