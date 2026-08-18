import { afterEach, describe, expect, it, vi } from "vitest";
import * as host from "../src/host.js";

afterEach(() => {
  delete (globalThis as { sdk?: unknown }).sdk;
});

describe("host checkpoint surface", () => {
  it("forwards setCheckpoint, getCheckpoint, and onResume to the sandbox hook", () => {
    const setCheckpoint = vi.fn();
    const getCheckpoint = vi.fn(() => new Uint8Array([4]));
    const onResume = vi.fn();
    (globalThis as { sdk?: unknown }).sdk = {
      host: { setCheckpoint, getCheckpoint, onResume },
    };
    const blob = new Uint8Array([1, 2]);
    const handler = () => {};

    host.setCheckpoint(blob);
    expect(setCheckpoint).toHaveBeenCalledWith(blob);
    expect(host.getCheckpoint()).toEqual(new Uint8Array([4]));
    host.onResume(handler);
    expect(onResume).toHaveBeenCalledWith(handler);
  });

  it("refuses checkpoint hooks outside a host sandbox", () => {
    expect(() => host.setCheckpoint(new Uint8Array())).toThrow(
      "host.setCheckpoint is only available inside a host sandbox",
    );
    expect(() => host.getCheckpoint()).toThrow(
      "host.getCheckpoint is only available inside a host sandbox",
    );
    expect(() => host.onResume(() => {})).toThrow(
      "host.onResume is only available inside a host sandbox",
    );
  });
});
