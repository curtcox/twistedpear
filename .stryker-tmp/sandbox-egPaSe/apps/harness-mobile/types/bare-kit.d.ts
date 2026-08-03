// @ts-nocheck
declare const BareKit: {
  readonly IPC: {
    on(event: "data", listener: (data: Buffer) => void): void;
    write(data: Buffer): void;
  };
};
