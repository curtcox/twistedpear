import { describe, expect, it } from "vitest";
import {
  PKCS7_BLOCK_SIZE,
  initialPackPkcs7State,
  initialUnpackPkcs7State,
  pkcs7Pad,
  pkcs7PadRawFromActions,
  pkcs7Unpad,
  pkcs7UnpadRawFromActions,
  shouldRejectPkcs7Unpad,
  shouldUsePkcs7Pad,
  shouldUsePkcs7Unpad,
  stepPkcs7PadWithActions,
  stepPkcs7UnpadWithActions,
} from "../src/pkcs7.js";

describe("protocol pkcs7", () => {
  it("pads to the next block and round-trips", () => {
    const data = new Uint8Array([1, 2, 3]);
    const padded = pkcs7Pad(data);
    expect(padded.length % PKCS7_BLOCK_SIZE).toBe(0);
    expect(padded[padded.length - 1]).toBe(PKCS7_BLOCK_SIZE - 3);
    expect([...pkcs7Unpad(padded)]).toEqual([1, 2, 3]);
  });

  it("pads a full block when already aligned", () => {
    const data = new Uint8Array(PKCS7_BLOCK_SIZE).fill(9);
    const padded = pkcs7Pad(data);
    expect(padded.length).toBe(PKCS7_BLOCK_SIZE * 2);
    expect([...pkcs7Unpad(padded)]).toEqual([...data]);
  });

  it("rejects invalid padding", () => {
    expect(() => pkcs7Unpad(new Uint8Array())).toThrow(/empty/);
    expect(() => pkcs7Unpad(new Uint8Array([1, 2, 0]))).toThrow(
      /invalid padding/,
    );
  });

  it("pads and unpads via WithActions", () => {
    const data = new Uint8Array([1, 2, 3]);
    const padded = stepPkcs7PadWithActions(initialPackPkcs7State(), {
      kind: "pkcs7/pad-gate",
      data,
    });
    expect(shouldUsePkcs7Pad(padded.actions)).toBe(true);
    const raw = pkcs7PadRawFromActions(padded.actions)!;
    expect([...raw]).toEqual([...pkcs7Pad(data)]);

    const unpadded = stepPkcs7UnpadWithActions(initialUnpackPkcs7State(), {
      kind: "pkcs7/unpad-gate",
      data: raw,
    });
    expect(shouldUsePkcs7Unpad(unpadded.actions)).toBe(true);
    expect([...pkcs7UnpadRawFromActions(unpadded.actions)!]).toEqual([1, 2, 3]);

    const rejectEmpty = stepPkcs7UnpadWithActions(initialUnpackPkcs7State(), {
      kind: "pkcs7/unpad-gate",
      data: new Uint8Array(),
    });
    expect(shouldRejectPkcs7Unpad(rejectEmpty.actions)).toBe(true);

    const rejectInvalid = stepPkcs7UnpadWithActions(initialUnpackPkcs7State(), {
      kind: "pkcs7/unpad-gate",
      data: new Uint8Array([1, 2, 0]),
    });
    expect(shouldRejectPkcs7Unpad(rejectInvalid.actions)).toBe(true);
  });
});
