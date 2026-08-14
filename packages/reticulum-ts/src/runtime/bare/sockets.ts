import type {
  BoundDatagramSocket,
  DatagramPacket,
  DuplexConnection,
  TcpConnectOptions,
  TcpFactory,
  TcpListenOptions,
  TcpListener,
  UdpFactory,
} from "../runtime.js";

type BareTcpModule = typeof import("bare-tcp");
type BareDgramModule = typeof import("bare-dgram");

let bareTcpModule: BareTcpModule | null = null;
let bareDgramModule: BareDgramModule | null = null;

async function loadBareTcp(): Promise<BareTcpModule> {
  bareTcpModule ??= await import("bare-tcp");
  return bareTcpModule;
}

async function loadBareDgram(): Promise<BareDgramModule> {
  bareDgramModule ??= await import("bare-dgram");
  return bareDgramModule;
}

function bareSocketConnection(
  socket: InstanceType<BareTcpModule["Socket"]>,
): DuplexConnection {
  const queue = new AsyncChunkQueue();
  let closed = false;

  socket.on("data", (chunk: unknown) => {
    const bytes =
      chunk instanceof Uint8Array
        ? chunk
        : Uint8Array.from(chunk as ArrayLike<number>);
    queue.push(bytes);
  });

  socket.on("close", () => {
    closed = true;
    queue.close();
  });

  socket.on("error", () => {
    closed = true;
    queue.close();
  });

  return {
    readable: queue,
    write: async (data) => {
      await new Promise<void>((resolve, reject) => {
        socket.write(data, (error?: Error | null) => {
          if (error === undefined || error === null) {
            resolve();
          } else {
            reject(error);
          }
        });
      });
    },
    close: async () => {
      await new Promise<void>((resolve) => {
        socket.end(() => resolve());
      });
    },
  };
}

class BareTcpFactory implements TcpFactory {
  async connect(options: TcpConnectOptions): Promise<DuplexConnection> {
    const tcp = await loadBareTcp();
    // `0` means no factory timer (caller owns connect timeout).
    const timeoutMs =
      options.connectTimeoutMs === 0 ? 0 : (options.connectTimeoutMs ?? 5_000);
    const socket = new tcp.Socket({ eagerOpen: true });

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timer =
        timeoutMs > 0
          ? setTimeout(() => {
              if (settled) {
                return;
              }

              settled = true;
              socket.destroy();
              reject(new Error(`TCP connect timed out after ${timeoutMs}ms`));
            }, timeoutMs)
          : null;

      socket.once("connect", () => {
        if (settled) {
          return;
        }

        settled = true;
        if (timer !== null) {
          clearTimeout(timer);
        }
        socket.setNoDelay(true);
        resolve();
      });

      socket.once("error", (error: Error) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timer !== null) {
          clearTimeout(timer);
        }
        reject(error);
      });

      socket.connect(options.port, options.host);
    });

    return bareSocketConnection(socket);
  }

  async listen(options: TcpListenOptions): Promise<TcpListener> {
    const tcp = await loadBareTcp();
    const server = tcp.createServer();
    const pending: DuplexConnection[] = [];
    const waiters: Array<(connection: DuplexConnection) => void> = [];
    let closed = false;

    server.on("connection", (socket: InstanceType<BareTcpModule["Socket"]>) => {
      socket.setNoDelay(true);
      const connection = bareSocketConnection(socket);
      const waiter = waiters.shift();
      if (waiter !== undefined) {
        waiter(connection);
      } else {
        pending.push(connection);
      }
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(options.port, options.host, () => {
        server.off("error", reject);
        resolve();
      });
    });

    const bound: unknown = server.address();
    if (
      bound === null ||
      typeof bound !== "object" ||
      !("address" in bound) ||
      !("port" in bound)
    ) {
      throw new Error("Failed to determine TCP listen address");
    }
    const address = bound as { address: string; port: number };

    return {
      address: { host: address.address, port: address.port },
      accept: async function* () {
        while (!closed) {
          const queued = pending.shift();
          if (queued !== undefined) {
            yield queued;
            continue;
          }

          const connection = await new Promise<DuplexConnection>((resolve) => {
            waiters.push(resolve);
          });

          yield connection;
        }
      },
      close: async () => {
        closed = true;
        await new Promise<void>((resolve, reject) => {
          server.close((error?: Error | null) => {
            if (error === undefined || error === null) {
              resolve();
            } else {
              reject(error);
            }
          });
        });
      },
    };
  }
}

class BareBoundDatagramSocket implements BoundDatagramSocket {
  private readonly queue = new AsyncDatagramQueue();
  private closed = false;
  readonly address: { readonly host: string; readonly port: number };

  constructor(
    private readonly socket: InstanceType<BareDgramModule["Socket"]>,
  ) {
    const bound = socket.address();
    if (bound === null) {
      throw new Error("UDP socket is not bound");
    }

    this.address = { host: bound.address, port: bound.port };
    socket.on(
      "message",
      (
        message: Buffer | Uint8Array,
        remote: { address: string; port: number },
      ) => {
        this.queue.push({
          data:
            message instanceof Uint8Array ? message : Uint8Array.from(message),
          host: remote.address,
          port: remote.port,
        });
      },
    );

    socket.on("close", () => {
      this.closed = true;
      this.queue.close();
    });
  }

  get packets(): AsyncIterable<DatagramPacket> {
    return this.queue;
  }

  async send(data: Uint8Array, host: string, port: number): Promise<void> {
    if (this.closed) {
      throw new Error("UDP socket is closed");
    }

    await new Promise<void>((resolve, reject) => {
      this.socket.send(data, port, host, (error?: Error | null) => {
        if (error === undefined || error === null) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    await new Promise<void>((resolve) => {
      this.socket.close(() => resolve());
    });
    this.queue.close();
  }
}

class BareUdpFactory implements UdpFactory {
  async bind(host: string, port: number): Promise<BoundDatagramSocket> {
    const dgram = await loadBareDgram();
    const socket = dgram.createSocket("udp4");

    await new Promise<void>((resolve, reject) => {
      socket.once("error", reject);
      socket.bind(port, host, () => {
        socket.off("error", reject);
        resolve();
      });
    });

    return new BareBoundDatagramSocket(socket);
  }
}

class AsyncChunkQueue implements AsyncIterable<Uint8Array> {
  private readonly values: Uint8Array[] = [];
  private readonly waiters: Array<
    (result: IteratorResult<Uint8Array>) => void
  > = [];
  private closed = false;

  push(chunk: Uint8Array): void {
    const waiter = this.waiters.shift();
    if (waiter !== undefined) {
      waiter({ done: false, value: chunk });
      return;
    }

    this.values.push(chunk);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ done: true, value: undefined });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
    return {
      next: async () => {
        const value = this.values.shift();
        if (value !== undefined) {
          return { done: false, value };
        }

        if (this.closed) {
          return { done: true, value: undefined };
        }

        return new Promise<IteratorResult<Uint8Array>>((resolve) => {
          this.waiters.push(resolve);
        });
      },
    };
  }
}

class AsyncDatagramQueue implements AsyncIterable<DatagramPacket> {
  private readonly values: DatagramPacket[] = [];
  private readonly waiters: Array<
    (result: IteratorResult<DatagramPacket>) => void
  > = [];
  private closed = false;

  push(packet: DatagramPacket): void {
    const waiter = this.waiters.shift();
    if (waiter !== undefined) {
      waiter({ done: false, value: packet });
      return;
    }

    this.values.push(packet);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ done: true, value: undefined });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<DatagramPacket> {
    return {
      next: async () => {
        const value = this.values.shift();
        if (value !== undefined) {
          return { done: false, value };
        }

        if (this.closed) {
          return { done: true, value: undefined };
        }

        return new Promise<IteratorResult<DatagramPacket>>((resolve) => {
          this.waiters.push(resolve);
        });
      },
    };
  }
}

export const bareTcpFactory = new BareTcpFactory();
export const bareUdpFactory = new BareUdpFactory();
