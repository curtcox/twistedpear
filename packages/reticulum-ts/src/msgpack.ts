/** Minimal msgpack encode/decode for RNS link request/response payloads. */

export function msgpackPackFloat(value: number): Uint8Array {
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);
  view.setUint8(0, 0xcb);
  view.setFloat64(1, value, false);
  return new Uint8Array(buffer);
}

export function msgpackPackBin(bytes: Uint8Array): Uint8Array {
  const length = bytes.length;
  if (length <= 0xff) {
    const output = new Uint8Array(2 + length);
    output[0] = 0xc4;
    output[1] = length;
    output.set(bytes, 2);
    return output;
  }

  const output = new Uint8Array(3 + length);
  output[0] = 0xc5;
  output[1] = (length >> 8) & 0xff;
  output[2] = length & 0xff;
  output.set(bytes, 3);
  return output;
}

export function msgpackPackNil(): Uint8Array {
  return new Uint8Array([0xc0]);
}

export function msgpackPackArray(items: ReadonlyArray<Uint8Array>): Uint8Array {
  if (items.length > 15) {
    throw new Error("msgpackPackArray supports at most 15 items");
  }

  const output = new Uint8Array(1 + items.reduce((total, item) => total + item.length, 0));
  output[0] = 0x90 | items.length;
  let offset = 1;
  for (const item of items) {
    output.set(item, offset);
    offset += item.length;
  }

  return output;
}

export function msgpackPackRequest(
  requestedAt: number,
  pathHash: Uint8Array,
  data: Uint8Array | null
): Uint8Array {
  return msgpackPackArray([
    msgpackPackFloat(requestedAt),
    msgpackPackBin(pathHash),
    data === null ? msgpackPackNil() : msgpackPackBin(data)
  ]);
}

export function msgpackPackResponse(requestId: Uint8Array, response: Uint8Array | null): Uint8Array {
  return msgpackPackArray([
    msgpackPackBin(requestId),
    response === null ? msgpackPackNil() : msgpackPackBin(response)
  ]);
}

export interface MsgpackValue {
  readonly type: "float" | "bin" | "nil" | "array";
  readonly float?: number;
  readonly bin?: Uint8Array;
  readonly array?: ReadonlyArray<MsgpackValue>;
}

export function msgpackUnpack(bytes: Uint8Array): MsgpackValue {
  const [value] = msgpackUnpackAt(bytes, 0);
  return value;
}

export function msgpackUnpackRequest(bytes: Uint8Array): [number, Uint8Array, Uint8Array | null] {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array === undefined || value.array.length !== 3) {
    throw new Error("Invalid request payload");
  }

  const [requestedAtValue, pathHashValue, dataValue] = value.array;
  if (requestedAtValue.type !== "float" || pathHashValue.type !== "bin" || pathHashValue.bin === undefined) {
    throw new Error("Invalid request payload fields");
  }

  const data =
    dataValue.type === "nil" ? null : dataValue.type === "bin" ? dataValue.bin ?? null : null;
  return [requestedAtValue.float ?? 0, pathHashValue.bin, data];
}

export function msgpackUnpackResponse(bytes: Uint8Array): [Uint8Array, Uint8Array | null] {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array === undefined || value.array.length !== 2) {
    throw new Error("Invalid response payload");
  }

  const [requestIdValue, responseValue] = value.array;
  if (requestIdValue.type !== "bin" || requestIdValue.bin === undefined) {
    throw new Error("Invalid response payload fields");
  }

  const response =
    responseValue.type === "nil"
      ? null
      : responseValue.type === "bin"
        ? responseValue.bin ?? null
        : null;
  return [requestIdValue.bin, response];
}

function msgpackUnpackAt(bytes: Uint8Array, offset: number): [MsgpackValue, number] {
  const tag = bytes[offset];
  if (tag === undefined) {
    throw new Error("Unexpected end of msgpack input");
  }

  if (tag === 0xc0) {
    return [{ type: "nil" }, offset + 1];
  }

  if (tag === 0xcb) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
    return [{ type: "float", float: view.getFloat64(1, false) }, offset + 9];
  }

  if (tag === 0xc4) {
    const length = bytes[offset + 1]!;
    const bin = bytes.subarray(offset + 2, offset + 2 + length);
    return [{ type: "bin", bin: Uint8Array.from(bin) }, offset + 2 + length];
  }

  if (tag === 0xc5) {
    const length = (bytes[offset + 1]! << 8) | bytes[offset + 2]!;
    const bin = bytes.subarray(offset + 3, offset + 3 + length);
    return [{ type: "bin", bin: Uint8Array.from(bin) }, offset + 3 + length];
  }

  if ((tag & 0xf0) === 0x90) {
    const count = tag & 0x0f;
    const array: MsgpackValue[] = [];
    let nextOffset = offset + 1;
    for (let index = 0; index < count; index += 1) {
      const [item, itemOffset] = msgpackUnpackAt(bytes, nextOffset);
      array.push(item);
      nextOffset = itemOffset;
    }

    return [{ type: "array", array }, nextOffset];
  }

  throw new Error(`Unsupported msgpack tag 0x${tag.toString(16)}`);
}
