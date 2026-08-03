// @ts-nocheck
import { createConnection, createServer, type Socket } from "node:net";
import { createSocket, type Socket as UdpSocket } from "node:dgram";
import type {
  BoundDatagramSocket,
  DatagramPacket,
  DuplexConnection,
  TcpConnectOptions,
  TcpFactory,
  TcpListenOptions,
  TcpListener,
  UdpBindOptions,
  UdpFactory
} from "../runtime.js";

function socketConnection(socket: Socket): DuplexConnection {
  return {
    readable: readSocket(socket),
    write: async (data) => {
      await new Promise<void>((resolve, reject) => {
        socket.write(data, (error) => {
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
    }
  };
}

async function* readSocket(socket: Socket): AsyncGenerator<Uint8Array> {
  for await (const chunk of socket) {
    if (chunk instanceof Uint8Array) {
      yield chunk;
    } else {
      yield Uint8Array.from(chunk as Buffer);
    }
  }
}

class NodeTcpFactory implements TcpFactory {
  async connect(options: TcpConnectOptions): Promise<DuplexConnection> {
    // `0` means no factory timer (caller owns connect timeout).
    const timeoutMs = options.connectTimeoutMs === 0 ? 0 : (options.connectTimeoutMs ?? 5_000);
    const socket = await new Promise<Socket>((resolve, reject) => {
      const connection = createConnection({ host: options.host, port: options.port });
      let settled = false;

      const timer =
        timeoutMs > 0
          ? setTimeout(() => {
              if (settled) {
                return;
              }

              settled = true;
              connection.destroy();
              reject(new Error(`TCP connect timed out after ${timeoutMs}ms`));
            }, timeoutMs)
          : null;

      connection.once("connect", () => {
        if (settled) {
          return;
        }

        settled = true;
        if (timer !== null) {
          clearTimeout(timer);
        }
        connection.setNoDelay(true);
        connection.setTimeout(0);
        resolve(connection);
      });

      connection.once("error", (error) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timer !== null) {
          clearTimeout(timer);
        }
        reject(error);
      });
    });

    return socketConnection(socket);
  }

  async listen(options: TcpListenOptions): Promise<TcpListener> {
    const server = createServer();
    const pending: DuplexConnection[] = [];
    const waiters: Array<(connection: DuplexConnection) => void> = [];
    let closed = false;

    server.on("connection", (socket) => {
      socket.setNoDelay(true);
      const connection = socketConnection(socket);
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

    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Failed to determine TCP listen address");
    }

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
          server.close((error) => {
            if (error === undefined) {
              resolve();
            } else {
              reject(error);
            }
          });
        });
      }
    };
  }
}

class NodeBoundDatagramSocket implements BoundDatagramSocket {
  private readonly queue = new AsyncDatagramQueue();
  private closed = false;
  readonly address: { readonly host: string; readonly port: number };

  constructor(private readonly socket: UdpSocket) {
    const address = socket.address();
    this.address = { host: address.address, port: address.port };
    socket.on("message", (message, remote) => {
      this.queue.push({
        data: Uint8Array.from(message),
        host: remote.address,
        port: remote.port
      });
    });

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
      this.socket.send(data, port, host, (error) => {
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

class NodeUdpFactory implements UdpFactory {
  async bind(host: string, port: number, options: UdpBindOptions = {}): Promise<BoundDatagramSocket> {
    const reuseAddress = options.reuseAddress ?? false;
    // Linux needs SO_REUSEPORT for cooperative UDP binds; macOS returns ENOTSUP.
    const reusePort = reuseAddress && process.platform === "linux";
    const socket = createSocket({
      type: host.includes(":") ? "udp6" : "udp4",
      reuseAddr: reuseAddress,
      ...(reusePort ? { reusePort: true } : {})
    });
    await new Promise<void>((resolve, reject) => {
      socket.once("error", reject);
      socket.bind(port, host, () => {
        socket.off("error", reject);
        resolve();
      });
    });

    return new NodeBoundDatagramSocket(socket);
  }
}

class AsyncDatagramQueue implements AsyncIterable<DatagramPacket> {
  private readonly values: DatagramPacket[] = [];
  private readonly waiters: Array<(result: IteratorResult<DatagramPacket>) => void> = [];
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
      }
    };
  }
}

export const nodeTcpFactory = new NodeTcpFactory();
export const nodeUdpFactory = new NodeUdpFactory();
