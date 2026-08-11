/**
 * Browser globals the Expo web host files use that `lib.dom` does not declare.
 * Everything else comes from `lib.dom` (see the `lib` entry in tsconfig.json).
 */

/** Web Serial API — only the surface `host/web-serial-relay.ts` touches. */
interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface Serial {
  requestPort(): Promise<SerialPort>;
}

interface Navigator {
  readonly serial: Serial;
}
