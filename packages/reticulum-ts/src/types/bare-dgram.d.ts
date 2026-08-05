declare module "bare-dgram" {
  export interface DgramAddress {
    address: string;
    family: string;
    port: number;
  }

  export class Socket {
    address(): DgramAddress | null;
    bind(port: number, address?: string | null, cb?: () => void): this;
    bind(port: number, cb: () => void): this;
    send(
      buffer: Uint8Array,
      port: number,
      address: string,
      cb?: (error?: Error | null) => void,
    ): void;
    close(cb?: () => void): void;
    on(
      event: "message",
      listener: (message: Uint8Array, remote: DgramAddress) => void,
    ): this;
    on(event: "error", listener: (error: Error) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "listening", listener: () => void): this;
    once(event: "listening", listener: () => void): this;
    once(event: "error", listener: (error: Error) => void): this;
    off(event: "error", listener: (error: Error) => void): this;
  }

  export function createSocket(type: "udp4" | "udp6"): Socket;
}
