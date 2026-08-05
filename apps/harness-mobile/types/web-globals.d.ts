/** Minimal browser globals for Expo web host files (Phase W1). */
declare class Worker {
  constructor(scriptURL: string | URL, options?: { type?: "classic" | "module" });
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: { data?: { channel?: string; data?: string } }) => void) | null;
}

interface TextEncoder {
  encode(input?: string): Uint8Array;
}

interface TextDecoder {
  decode(input?: Uint8Array): string;
}

declare const TextEncoder: {
  new (): TextEncoder;
};

declare const TextDecoder: {
  new (): TextDecoder;
};

declare function postMessage(message: unknown): void;
