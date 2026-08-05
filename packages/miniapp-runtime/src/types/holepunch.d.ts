declare module "corestore" {
  export default class Corestore {
    constructor(path: string);
    ready(): Promise<void>;
    close(): Promise<void>;
    get(options: { name: string }): unknown;
  }
}

declare module "hyperbee" {
  export interface HyperbeeEntry {
    readonly key: string;
    readonly value: Uint8Array;
    readonly seq: number;
  }

  export default class Hyperbee {
    constructor(
      core: unknown,
      options?: { keyEncoding?: string; valueEncoding?: string },
    );
    ready(): Promise<void>;
    close(): Promise<void>;
    get(key: string): Promise<{ value: Uint8Array } | null>;
    put(key: string, value: Uint8Array): Promise<void>;
    del(key: string): Promise<void>;
    createReadStream(options?: {
      gte?: string;
      lt?: string;
    }): AsyncIterable<HyperbeeEntry>;
  }
}
