import type { CryptoProvider } from "@twistedpear/reticulum-ts";
import {
  Packet,
  RawPacketInterface,
  type ReticulumInterfaceOptions,
} from "@twistedpear/reticulum-ts";
import type { BlePipe } from "../pipes.js";
import {
  fragmentForMtu,
  reassembleBleFrames,
  createBleReassemblyState,
} from "./spec-framing.js";

export const BLE_INTERFACE_MTU = 500;

export interface BleInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
  readonly pipe: BlePipe;
  readonly pipeMtu?: number;
}

export class BleInterface extends RawPacketInterface {
  private readonly reassembly = createBleReassemblyState();
  private readActive = false;
  private eventsBound = false;

  constructor(
    private readonly provider: CryptoProvider,
    private readonly options: BleInterfaceOptions,
  ) {
    super(
      { ...options, mtu: options.mtu ?? BLE_INTERFACE_MTU },
      options.incoming ?? true,
      options.outgoing ?? true,
    );
    this.bindPipeEvents();
  }

  static async open(
    provider: CryptoProvider,
    options: BleInterfaceOptions,
  ): Promise<BleInterface> {
    const iface = new BleInterface(provider, options);
    await iface.start();
    return iface;
  }

  async start(): Promise<void> {
    await this.options.pipe.start();
    this.online = this.options.pipe.connected;
    this.readActive = true;
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.provider, frame);
  }

  protected async writeBytes(bytes: Uint8Array): Promise<void> {
    const mtu = this.options.pipeMtu ?? this.options.pipe.mtu;
    for (const frame of fragmentForMtu(bytes, mtu)) {
      await this.options.pipe.write(frame);
    }
  }

  protected async closeInterface(): Promise<void> {
    this.readActive = false;
    await this.options.pipe.stop();
  }

  private bindPipeEvents(): void {
    if (this.eventsBound) {
      return;
    }

    this.eventsBound = true;
    this.options.pipe.setEvents({
      onData: (data) => {
        if (!this.readActive) {
          return;
        }

        const result = reassembleBleFrames(this.reassembly, data);
        Object.assign(this.reassembly, result.state);
        if (result.message !== null) {
          this.receiveBytes(result.message);
        }
      },
      onConnect: () => {
        this.online = true;
      },
      onDisconnect: () => {
        this.online = false;
      },
    });
  }
}
