import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  hexToBytes,
} from "@twistedpear/reticulum-ts";
import { APP_NAME, LXMessage, LXMessageMethod } from "../src/index.js";

const provider = new NodeCryptoProvider();
const vectors = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../conformance/vectors/lxmf.json",
    ),
    "utf8",
  ),
) as {
  messages: ReadonlyArray<{
    name: string;
    timestamp: number;
    title: string;
    content: string;
    fieldsHex: Record<string, string>;
    destinationHashHex: string;
    sourceHashHex: string;
    messageHashHex: string;
    signatureHex: string;
    packedHex: string;
  }>;
};

const identityVectors = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../conformance/vectors/identity.json",
    ),
    "utf8",
  ),
) as {
  identities: ReadonlyArray<{ name: string; privateKeyHex: string }>;
};

function identityByName(name: string): Identity {
  const entry = identityVectors.identities.find(
    (candidate) => candidate.name === name,
  );
  if (entry === undefined) {
    throw new Error(`Missing identity vector: ${name}`);
  }

  const identity = Identity.fromBytes(
    provider,
    hexToBytes(entry.privateKeyHex),
  );
  if (identity === null) {
    throw new Error(`Could not load identity vector: ${name}`);
  }

  return identity;
}

function deliverySource(identity: Identity): Destination {
  return new Destination(provider, {
    identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: APP_NAME,
    aspects: ["delivery"],
  });
}

function deliveryDestination(identity: Identity): Destination {
  return new Destination(provider, {
    identity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: APP_NAME,
    aspects: ["delivery"],
  });
}

describe("LXMF golden vectors", () => {
  const alice = identityByName("alice");
  const bob = identityByName("bob");
  const aliceDelivery = deliverySource(alice);
  const bobDeliveryOut = deliveryDestination(bob);

  for (const vector of vectors.messages) {
    it(`packs ${vector.name} byte-identically`, () => {
      const fields = Object.fromEntries(
        Object.entries(vector.fieldsHex).map(([key, value]) => [
          Number.parseInt(key, 16),
          hexToBytes(value),
        ]),
      );

      const message = LXMessage.pack({
        provider,
        destination: bobDeliveryOut,
        source: aliceDelivery,
        title: vector.title,
        content: vector.content,
        fields,
        timestamp: vector.timestamp,
        deferStamp: true,
        desiredMethod: LXMessageMethod.DIRECT,
      });

      expect(Buffer.from(message.packed!).toString("hex")).toBe(
        vector.packedHex,
      );
      expect(Buffer.from(message.hash!).toString("hex")).toBe(
        vector.messageHashHex,
      );
      expect(Buffer.from(message.signature!).toString("hex")).toBe(
        vector.signatureHex,
      );
    });

    it(`unpacks and validates ${vector.name}`, () => {
      const packed = hexToBytes(vector.packedHex);
      const message = LXMessage.unpackFromBytes(packed, {
        provider,
        sourceIdentity: alice,
      });

      expect(message.signatureValidated).toBe(true);
      expect(message.titleAsString()).toBe(vector.title);
      expect(message.contentAsString()).toBe(vector.content);
      expect(Buffer.from(message.hash!).toString("hex")).toBe(
        vector.messageHashHex,
      );
    });
  }
});
