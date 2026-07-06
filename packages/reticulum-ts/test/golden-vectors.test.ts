import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  Announce,
  BareCryptoProvider,
  Identity,
  NodeCryptoProvider,
  Packet,
  PacketContextFlagValue,
  PacketHeaderTypeValue,
  PacketTypeValue,
  PureCryptoProvider,
  Token,
  TransportTypeValue,
  bytesToHex,
  hexToBytes,
  hashBytes,
  rnsHkdf,
  type CryptoProvider,
  type DestinationTypeValue
} from "../src/index.js";

interface GoldenCryptoVectors {
  readonly upstream: {
    readonly reticulumVersion: string;
  };
  readonly sha256: ReadonlyArray<{
    readonly name: string;
    readonly inputHex: string;
    readonly digestHex: string;
  }>;
  readonly hmacSha256: ReadonlyArray<{
    readonly name: string;
    readonly keyHex: string;
    readonly inputHex: string;
    readonly digestHex: string;
  }>;
  readonly hkdfSha256: ReadonlyArray<{
    readonly name: string;
    readonly keyMaterialHex: string;
    readonly saltHex: string;
    readonly infoHex: string;
    readonly length: number;
    readonly outputHex: string;
  }>;
}

interface GoldenIdentityVectors {
  readonly upstream: {
    readonly reticulumVersion: string;
  };
  readonly identities: ReadonlyArray<{
    readonly name: string;
    readonly privateKeyHex: string;
    readonly publicKeyHex: string;
    readonly identityHashHex: string;
  }>;
  readonly token: ReadonlyArray<{
    readonly name: string;
    readonly keyHex: string;
    readonly ivHex: string;
    readonly plaintextHex: string;
    readonly ciphertextHex: string;
  }>;
  readonly signatures: ReadonlyArray<{
    readonly name: string;
    readonly identity: string;
    readonly messageHex: string;
    readonly signatureHex: string;
  }>;
  readonly hkdf: ReadonlyArray<{
    readonly name: string;
    readonly deriveFromHex: string;
    readonly saltIdentity: string;
    readonly contextHex: string;
    readonly length: number;
    readonly outputHex: string;
  }>;
  readonly encryption: ReadonlyArray<{
    readonly name: string;
    readonly sender: string;
    readonly recipient: string;
    readonly plaintextHex: string;
    readonly ephemeralPrivateKeyHex: string;
    readonly tokenIvHex: string;
    readonly ratchetPrivateKeyHex?: string;
    readonly ratchetPublicKeyHex?: string;
    readonly ciphertextHex: string;
  }>;
  readonly ratchets: ReadonlyArray<{
    readonly name: string;
    readonly privateKeyHex: string;
    readonly publicKeyHex: string;
    readonly ratchetIdHex: string;
  }>;
}

interface GoldenPacketVectors {
  readonly upstream: {
    readonly reticulumVersion: string;
  };
  readonly destinations: ReadonlyArray<{
    readonly name: string;
    readonly identityHashHex: string;
    readonly appName: string;
    readonly aspects: ReadonlyArray<string>;
    readonly expandedName: string;
    readonly nameHashHex: string;
    readonly destinationHashHex: string;
  }>;
  readonly packets: ReadonlyArray<{
    readonly name: string;
    readonly headerType: PacketHeaderTypeValue;
    readonly contextFlag: PacketContextFlagValue;
    readonly transportType: TransportTypeValue;
    readonly destinationType: DestinationTypeValue;
    readonly packetType: PacketTypeValue;
    readonly hops: number;
    readonly transportIdHex?: string;
    readonly destinationHashHex: string;
    readonly context: number;
    readonly dataHex: string;
    readonly rawHex: string;
    readonly hashablePartHex: string;
    readonly packetHashHex: string;
  }>;
  readonly announces?: ReadonlyArray<{
    readonly name: string;
    readonly destinationHashHex: string;
    readonly nameHashHex: string;
    readonly publicKeyHex: string;
    readonly randomHashHex: string;
    readonly ratchetPublicKeyHex: string | null;
    readonly appDataHex: string;
    readonly signatureHex: string;
    readonly dataHex: string;
    readonly rawHex: string;
  }>;
}

const vectorsRoot = resolve(import.meta.dirname, "../../../conformance/vectors");
const cryptoVectors = JSON.parse(readFileSync(resolve(vectorsRoot, "crypto.json"), "utf8")) as GoldenCryptoVectors;
const identityVectors = JSON.parse(
  readFileSync(resolve(vectorsRoot, "identity.json"), "utf8")
) as GoldenIdentityVectors;
const packetVectors = JSON.parse(readFileSync(resolve(vectorsRoot, "packet.json"), "utf8")) as GoldenPacketVectors;

const providers: ReadonlyArray<CryptoProvider> = [
  new NodeCryptoProvider(),
  new PureCryptoProvider(),
  new BareCryptoProvider()
];

function identityByName(name: string): GoldenIdentityVectors["identities"][number] {
  const identity = identityVectors.identities.find((entry) => entry.name === name);
  if (identity === undefined) {
    throw new Error(`Missing identity vector: ${name}`);
  }

  return identity;
}

describe.each(providers.map((provider) => [provider.name, provider] as const))(
  "golden crypto vectors (%s provider)",
  (_name, provider) => {
    it("records the pinned Python reference version", () => {
      expect(cryptoVectors.upstream.reticulumVersion).toBe("0.9.4");
    });

    it.each(cryptoVectors.sha256)("matches sha256 vector $name", (vector) => {
      expect(hashBytes(provider, hexToBytes(vector.inputHex))).toBe(vector.digestHex);
    });

    it.each(cryptoVectors.hmacSha256)("matches hmac-sha256 vector $name", (vector) => {
      const digest = provider.hmacSha256(hexToBytes(vector.keyHex), hexToBytes(vector.inputHex));
      expect(bytesToHex(digest)).toBe(vector.digestHex);
    });

    it.each(cryptoVectors.hkdfSha256)("matches hkdf-sha256 vector $name", (vector) => {
      const output = provider.hkdf({
        hash: "sha256",
        keyMaterial: hexToBytes(vector.keyMaterialHex),
        salt: hexToBytes(vector.saltHex),
        info: hexToBytes(vector.infoHex),
        length: vector.length
      });

      expect(bytesToHex(output)).toBe(vector.outputHex);
    });
  }
);

describe.each(providers.map((provider) => [provider.name, provider] as const))(
  "golden identity vectors (%s provider)",
  (_name, provider) => {
    it("records the pinned Python reference version", () => {
      expect(identityVectors.upstream.reticulumVersion).toBe("0.9.4");
    });

    it.each(identityVectors.identities)("derives identity hash for $name", (vector) => {
      const identity = Identity.fromBytes(provider, hexToBytes(vector.privateKeyHex));
      expect(identity).not.toBeNull();
      expect(bytesToHex(identity!.getPublicKey())).toBe(vector.publicKeyHex);
      expect(bytesToHex(identity!.hash)).toBe(vector.identityHashHex);
    });

    it.each(identityVectors.token)("matches token vector $name", (vector) => {
      const token = new Token(provider, hexToBytes(vector.keyHex));
      const ciphertext = token.encrypt(hexToBytes(vector.plaintextHex), {
        iv: hexToBytes(vector.ivHex)
      });
      expect(bytesToHex(ciphertext)).toBe(vector.ciphertextHex);
      expect(bytesToHex(token.decrypt(ciphertext))).toBe(vector.plaintextHex);
    });

    it.each(identityVectors.signatures)("matches signature vector $name", (vector) => {
      const source = identityByName(vector.identity);
      const identity = Identity.fromBytes(provider, hexToBytes(source.privateKeyHex));
      expect(identity).not.toBeNull();

      const message = hexToBytes(vector.messageHex);
      expect(bytesToHex(identity!.sign(message))).toBe(vector.signatureHex);
      expect(identity!.validate(hexToBytes(vector.signatureHex), message)).toBe(true);
    });

    it.each(identityVectors.hkdf)("matches hkdf vector $name", (vector) => {
      const saltIdentity = identityByName(vector.saltIdentity);
      const output = rnsHkdf(
        provider,
        vector.length,
        hexToBytes(vector.deriveFromHex),
        hexToBytes(saltIdentity.identityHashHex),
        hexToBytes(vector.contextHex)
      );
      expect(bytesToHex(output)).toBe(vector.outputHex);
    });

    it.each(identityVectors.encryption)("matches encryption vector $name", (vector) => {
      const recipient = identityByName(vector.recipient);
      const decryptor = Identity.fromBytes(provider, hexToBytes(recipient.privateKeyHex));
      const encryptor = new Identity(provider, false);
      encryptor.loadPublicKey(hexToBytes(recipient.publicKeyHex));

      const encryptOptions = {
        ephemeralPrivateKey: hexToBytes(vector.ephemeralPrivateKeyHex),
        tokenIv: hexToBytes(vector.tokenIvHex),
        ...(vector.ratchetPublicKeyHex === undefined
          ? {}
          : { ratchetPublicKey: hexToBytes(vector.ratchetPublicKeyHex) })
      };

      const ciphertext = encryptor.encrypt(hexToBytes(vector.plaintextHex), encryptOptions);
      expect(bytesToHex(ciphertext)).toBe(vector.ciphertextHex);

      const decryptOptions =
        vector.ratchetPrivateKeyHex === undefined
          ? {}
          : { ratchets: [hexToBytes(vector.ratchetPrivateKeyHex)] };

      const result = decryptor!.decrypt(ciphertext, decryptOptions);
      expect(result.plaintext).not.toBeNull();
      expect(bytesToHex(result.plaintext!)).toBe(vector.plaintextHex);
    });

    it.each(identityVectors.ratchets)("derives ratchet id for $name", (vector) => {
      const publicKey = hexToBytes(vector.publicKeyHex);
      expect(bytesToHex(Identity.ratchetPublicBytes(provider, hexToBytes(vector.privateKeyHex)))).toBe(
        vector.publicKeyHex
      );
      expect(bytesToHex(Identity.ratchetId(provider, publicKey))).toBe(vector.ratchetIdHex);
    });
  }
);

describe("provider cross-check", () => {
  const [nodeProvider, pureProvider] = providers;

  it("produces identical token ciphertext for fixed inputs", () => {
    const key = hexToBytes("00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff");
    const iv = hexToBytes("aabbccddeeff00112233445566778899");
    const plaintext = hexToBytes("68656c6c6f207265746963756c756d");

    const nodeToken = new Token(nodeProvider!, hexToBytes(key));
    const pureToken = new Token(pureProvider!, hexToBytes(key));

    expect(bytesToHex(nodeToken.encrypt(plaintext, { iv }))).toBe(
      bytesToHex(pureToken.encrypt(plaintext, { iv }))
    );
  });

  it("produces identical identity encryption for fixed keys", () => {
    const alice = identityByName("alice");
    const bob = identityByName("bob");
    const ephemeral = hexToBytes("1111111111111111111111111111111111111111111111111111111111111111");

    for (const providerPair of [
      [nodeProvider, pureProvider] as const,
      [pureProvider, nodeProvider] as const
    ]) {
      const encryptor = new Identity(providerPair[0]!, false);
      encryptor.loadPublicKey(hexToBytes(bob.publicKeyHex));
      const ciphertext = encryptor.encrypt(hexToBytes("616c69636520746f20626f"), {
        ephemeralPrivateKey: ephemeral
      });

      const decryptor = Identity.fromBytes(providerPair[1]!, hexToBytes(bob.privateKeyHex));
      const result = decryptor!.decrypt(ciphertext);
      expect(bytesToHex(result.plaintext!)).toBe("616c69636520746f20626f");
    }

    expect(alice.identityHashHex).toBeTruthy();
  });
});

describe.each(providers.map((provider) => [provider.name, provider] as const))(
  "golden packet and destination vectors (%s provider)",
  (_name, provider) => {
    it("records the pinned Python reference version", () => {
      expect(packetVectors.upstream.reticulumVersion).toBe("0.9.4");
    });

    it.each(packetVectors.destinations)("derives destination hash for $name", (vector) => {
      const identityHash = hexToBytes(vector.identityHashHex);
      expect(Destination.expandName(identityHash, vector.appName, ...vector.aspects)).toBe(vector.expandedName);
      expect(bytesToHex(Destination.nameHash(provider, vector.appName, ...vector.aspects))).toBe(
        vector.nameHashHex
      );
      expect(bytesToHex(Destination.hash(provider, identityHash, vector.appName, ...vector.aspects))).toBe(
        vector.destinationHashHex
      );

      const destination = new Destination(provider, {
        identity: identityHash,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: vector.appName,
        aspects: vector.aspects
      });
      expect(destination.name).toBe(vector.expandedName);
      expect(bytesToHex(destination.nameHash)).toBe(vector.nameHashHex);
      expect(destination.hexhash).toBe(vector.destinationHashHex);
    });

    it.each(packetVectors.packets)("encodes, decodes and hashes packet vector $name", (vector) => {
      const packet = Packet.fromFields(provider, {
        headerType: vector.headerType,
        contextFlag: vector.contextFlag,
        transportType: vector.transportType,
        destinationType: vector.destinationType,
        packetType: vector.packetType,
        hops: vector.hops,
        transportId: vector.transportIdHex === undefined ? undefined : hexToBytes(vector.transportIdHex),
        destinationHash: hexToBytes(vector.destinationHashHex),
        context: vector.context,
        data: hexToBytes(vector.dataHex)
      });

      expect(bytesToHex(packet.raw)).toBe(vector.rawHex);
      expect(bytesToHex(packet.hashablePart())).toBe(vector.hashablePartHex);
      expect(bytesToHex(packet.hash())).toBe(vector.packetHashHex);

      const decoded = Packet.decode(provider, hexToBytes(vector.rawHex));
      expect(decoded).not.toBeNull();
      expect(decoded!.headerType).toBe(vector.headerType);
      expect(decoded!.contextFlag).toBe(vector.contextFlag);
      expect(decoded!.transportType).toBe(vector.transportType);
      expect(decoded!.destinationType).toBe(vector.destinationType);
      expect(decoded!.packetType).toBe(vector.packetType);
      expect(decoded!.hops).toBe(vector.hops);
      expect(bytesToHex(decoded!.destinationHash)).toBe(vector.destinationHashHex);
      expect(decoded!.transportId === null ? undefined : bytesToHex(decoded!.transportId)).toBe(vector.transportIdHex);
      expect(decoded!.context).toBe(vector.context);
      expect(bytesToHex(decoded!.data)).toBe(vector.dataHex);
      expect(bytesToHex(decoded!.hash())).toBe(vector.packetHashHex);
    });

    it("creates and validates explicit and implicit packet proofs", () => {
      const vector = packetVectors.packets[0]!;
      const identityVector = identityByName("alice");
      const identity = Identity.fromBytes(provider, hexToBytes(identityVector.privateKeyHex));
      expect(identity).not.toBeNull();

      const packet = Packet.decode(provider, hexToBytes(vector.rawHex));
      expect(packet).not.toBeNull();

      const explicitProof = packet!.createProof(identity!);
      expect(bytesToHex(explicitProof.subarray(0, 32))).toBe(vector.packetHashHex);
      expect(packet!.validateProof(identity!, explicitProof)).toBe(true);

      const implicitProof = packet!.createProof(identity!, { explicit: false });
      expect(implicitProof.length).toBe(64);
      expect(packet!.validateProof(identity!, implicitProof)).toBe(true);

      const tamperedProof = Uint8Array.from(explicitProof);
      tamperedProof[0] = tamperedProof[0]! ^ 0x01;
      expect(packet!.validateProof(identity!, tamperedProof)).toBe(false);
      expect(packet!.validateProof(identity!, explicitProof.subarray(0, 12))).toBe(false);
      expect(bytesToHex(packet!.proofDestinationHash())).toBe(vector.packetHashHex.slice(0, 32));
    });

    it("rejects invalid enum values during construction", () => {
      const vector = packetVectors.packets[0]!;
      expect(() =>
        Packet.fromFields(provider, {
          headerType: vector.headerType,
          contextFlag: 2 as PacketContextFlagValue,
          transportType: vector.transportType,
          destinationType: vector.destinationType,
          packetType: vector.packetType,
          destinationHash: hexToBytes(vector.destinationHashHex)
        })
      ).toThrow("Unknown packet context flag");
    });

    it.each(packetVectors.announces ?? [])("builds and validates announce vector $name", (vector) => {
      const alice = identityByName("alice");
      const identity = Identity.fromBytes(provider, hexToBytes(alice.privateKeyHex));
      expect(identity).not.toBeNull();

      const destination = new Destination(provider, {
        identity: identity!,
        direction: DestinationDirection.IN,
        type: DestinationType.SINGLE,
        appName: "example",
        aspects: ["announce"]
      });

      const packet = Announce.buildPacket(provider, destination, {
        randomHash: hexToBytes(vector.randomHashHex),
        appData: hexToBytes(vector.appDataHex),
        ...(vector.ratchetPublicKeyHex === null
          ? {}
          : { ratchetPublicKey: hexToBytes(vector.ratchetPublicKeyHex) })
      });

      expect(bytesToHex(packet.raw)).toBe(vector.rawHex);
      expect(bytesToHex(packet.data)).toBe(vector.dataHex);
      expect(Announce.validate(provider, packet)).toBe(true);

      const parsed = Announce.parse(packet);
      expect(parsed).not.toBeNull();
      expect(bytesToHex(parsed!.destinationHash)).toBe(vector.destinationHashHex);
      expect(bytesToHex(parsed!.publicKey)).toBe(vector.publicKeyHex);
      expect(bytesToHex(parsed!.nameHash)).toBe(vector.nameHashHex);
      expect(bytesToHex(parsed!.randomHash)).toBe(vector.randomHashHex);
      expect(parsed!.ratchetPublicKey === null ? null : bytesToHex(parsed!.ratchetPublicKey)).toBe(
        vector.ratchetPublicKeyHex
      );
      expect(bytesToHex(parsed!.signature)).toBe(vector.signatureHex);
      expect(parsed!.appData === null ? "" : bytesToHex(parsed!.appData)).toBe(vector.appDataHex);

      const decoded = Packet.decode(provider, hexToBytes(vector.rawHex));
      expect(decoded).not.toBeNull();
      expect(Announce.validate(provider, decoded!)).toBe(true);
    });

    it("rejects announces with tampered signed data", () => {
      const vector = packetVectors.announces?.[0];
      expect(vector).toBeDefined();
      const raw = hexToBytes(vector!.rawHex);
      raw[raw.length - 1] = raw[raw.length - 1]! ^ 0x01;
      const decoded = Packet.decode(provider, raw);
      expect(decoded).not.toBeNull();
      expect(Announce.validate(provider, decoded!)).toBe(false);
    });
  }
);
