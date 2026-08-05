import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hexToBytes, bytesToHex } from "@twistedpear/reticulum-ts";
import {
  decodeAcousticFec,
  encodeAcousticFec,
  sliceForDisplay,
} from "@twistedpear/reticulum-interfaces";
import { openNtfyPacket, sealNtfyPacket } from "../src/ntfy-interface.js";
import {
  interfaceDirectionFlags,
  type InterfaceDirection,
} from "../src/types.js";

const vectors = JSON.parse(
  readFileSync(
    new URL(
      "../../../specs/spec-media/vectors/relay-interfaces.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  directions: Record<
    InterfaceDirection,
    { incoming: boolean; outgoing: boolean }
  >;
  optical: { inputHex: string; frameBytes: number; framesHex: string[] };
  acousticFec: { inputHex: string; encodedHex: string };
  ntfy: {
    secret: string;
    nonceHex: string;
    inputHex: string;
    sealedHex: string;
  };
};

describe("relay interface golden vectors", () => {
  it("pins direction flags", () => {
    for (const direction of ["tx", "rx", "both"] as const) {
      expect(interfaceDirectionFlags(direction)).toEqual(
        vectors.directions[direction],
      );
    }
  });
  it("pins optical systematic and repair frames", () => {
    expect(
      sliceForDisplay(
        hexToBytes(vectors.optical.inputHex),
        vectors.optical.frameBytes,
      ).map(bytesToHex),
    ).toEqual(vectors.optical.framesHex);
  });

  it("pins acoustic repetition FEC", () => {
    const encoded = encodeAcousticFec(hexToBytes(vectors.acousticFec.inputHex));
    expect(bytesToHex(encoded)).toBe(vectors.acousticFec.encodedHex);
    expect(decodeAcousticFec(encoded)).toEqual(
      hexToBytes(vectors.acousticFec.inputHex),
    );
  });

  it("pins ntfy authenticated encryption", () => {
    const sealed = sealNtfyPacket(
      vectors.ntfy.secret,
      hexToBytes(vectors.ntfy.nonceHex),
      hexToBytes(vectors.ntfy.inputHex),
    );
    expect(bytesToHex(sealed)).toBe(vectors.ntfy.sealedHex);
    expect(openNtfyPacket(vectors.ntfy.secret, sealed)).toEqual(
      hexToBytes(vectors.ntfy.inputHex),
    );
  });
});
