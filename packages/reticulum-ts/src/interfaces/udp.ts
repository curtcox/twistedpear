import type { CryptoProvider } from "../crypto/provider.js";
import type { Runtime } from "../runtime/runtime.js";
import { Packet } from "../packet.js";
import { RawPacketInterface, type ReticulumInterfaceOptions } from "./interface.js";

/** Mirrors RNS/Interfaces/UDPInterface.py defaults. */
export const UDP_HW_MTU = 1_064;

export interface UdpInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly runtime: Runtime;
  readonly listenHost: string;
  readonly listenPort: number;
  readonly forwardHost: string;
  readonly forwardPort: number;
}

export class UdpInterface extends RawPacketInterface {
  private socket: Awaited<ReturnType<Runtime["udp"]["bind"]>> | null = null;
  private readTask: Promise<void> | null = null;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly runtime: Runtime,
    private readonly options: UdpInterfaceOptions
  ) {
    super({ ...options, mtu: options.mtu ?? UDP_HW_MTU }, options.incoming ?? true, options.outgoing ?? true);
  }

  static async open(
    provider: CryptoProvider,
    runtime: Runtime,
    options: UdpInterfaceOptions
  ): Promise<UdpInterface> {
    const iface = new UdpInterface(provider, runtime, options);
    await iface.start();
    return iface;
  }

  async start(): Promise<void> {
    this.socket = await this.runtime.udp.bind(this.options.listenHost, this.options.listenPort);
    this.online = true;
    this.readTask = this.readLoop();
  }

  get address(): { readonly host: string; readonly port: number } | null {
    return this.socket?.address ?? null;
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.provider, frame);
  }

  protected async writeBytes(bytes: Uint8Array): Promise<void> {
    if (this.socket === null) {
      throw new Error(`UDP interface ${this.name} is not bound`);
    }

    await this.socket.send(bytes, this.options.forwardHost, this.options.forwardPort);
  }

  protected async closeInterface(): Promise<void> {
    if (this.socket !== null) {
      await this.socket.close();
      this.socket = null;
    }
  }

  private async readLoop(): Promise<void> {
    if (this.socket === null) {
      return;
    }

    for await (const datagram of this.socket.packets) {
      this.receiveBytes(datagram.data);
    }
  }
}
