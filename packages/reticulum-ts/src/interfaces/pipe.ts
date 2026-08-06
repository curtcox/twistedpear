import type { CryptoProvider } from "../crypto/provider.js";
import { Packet } from "../packet.js";
import {
  HdlcPacketInterface,
  type ReticulumInterfaceOptions,
} from "./interface.js";

export interface PipeInterfaceOptions extends ReticulumInterfaceOptions {
  readonly provider: CryptoProvider;
}

export class PipeInterface extends HdlcPacketInterface {
  private peer: PipeInterface | null = null;

  constructor(
    private readonly provider: CryptoProvider,
    options: PipeInterfaceOptions,
  ) {
    super(options);
  }

  static pair(
    provider: CryptoProvider,
    left: Omit<PipeInterfaceOptions, "provider"> = { name: "pipe:left" },
    right: Omit<PipeInterfaceOptions, "provider"> = { name: "pipe:right" },
  ): readonly [PipeInterface, PipeInterface] {
    const leftInterface = new PipeInterface(provider, { ...left, provider });
    const rightInterface = new PipeInterface(provider, { ...right, provider });
    leftInterface.peer = rightInterface;
    rightInterface.peer = leftInterface;
    return [leftInterface, rightInterface] as const;
  }

  protected decodePacket(frame: Uint8Array): Packet | null {
    return Packet.decode(this.provider, frame);
  }

  protected async writeBytes(bytes: Uint8Array): Promise<void> {
    if (this.peer === null) {
      throw new Error(`Pipe interface ${this.name} is not connected`);
    }

    this.peer.receiveBytes(bytes);
  }

  protected async closeInterface(): Promise<void> {
    this.peer = null;
  }
}
