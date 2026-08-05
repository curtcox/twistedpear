import { describe, expect, it } from "vitest";
import {
  DESTINATION_IDENTITY_HASH_BYTES,
  DESTINATION_NAME_HASH_BYTES,
  aspectFilterFromActions,
  destinationHashMaterial,
  destinationHashMaterialRawFromActions,
  destinationNameHashMaterial,
  destinationNameHashMaterialRawFromActions,
  expandDestinationName,
  expandedDestinationNameFromActions,
  initialDestinationHashMaterialState,
  initialDestinationIdentityHashPlanState,
  initialDestinationIdentityHashState,
  initialDestinationNameHashMaterialState,
  initialExpandDestinationNameState,
  initialParseAspectFilterState,
  initialValidateDestinationNamePartState,
  parseAspectFilter,
  planDestinationIdentityHash,
  shouldMissDestinationIdentityHash,
  shouldMissDestinationIdentityHashPlan,
  shouldProceedValidateDestinationNamePart,
  shouldRejectDestinationNameHashMaterial,
  shouldRejectExpandDestinationName,
  shouldRejectLengthDestinationIdentityHash,
  shouldRejectLengthDestinationIdentityHashPlan,
  shouldRejectParseAspectFilter,
  shouldRejectValidateDestinationNamePart,
  shouldUseBytesDestinationIdentityHash,
  shouldUseBytesDestinationIdentityHashPlan,
  shouldUseDestinationHashMaterial,
  shouldUseDestinationNameHashMaterial,
  shouldUseExpandDestinationName,
  shouldUseObjectDestinationIdentityHash,
  shouldUseObjectDestinationIdentityHashPlan,
  shouldUseParseAspectFilter,
  stepDestinationHashMaterialWithActions,
  destinationIdentityHashPlanFromActions,
  stepDestinationIdentityHashPlanWithActions,
  stepDestinationIdentityHashWithActions,
  stepDestinationNameHashMaterialWithActions,
  stepExpandDestinationNameWithActions,
  stepParseAspectFilterWithActions,
  stepValidateDestinationNamePartWithActions,
  validateDestinationNamePart,
} from "../src/destination-name.js";
import { utf8Decode, utf8Encode } from "../src/utf8.js";

describe("protocol utf8", () => {
  it("round-trips ascii and multi-byte", () => {
    const samples = ["hello", "café", "𝄞"];
    for (const sample of samples) {
      expect(utf8Decode(utf8Encode(sample))).toBe(sample);
    }
  });
});

describe("protocol destination name", () => {
  it("expands app and aspects without identity", () => {
    expect(expandDestinationName(null, "lxmf", ["delivery"])).toBe(
      "lxmf.delivery",
    );
  });

  it("appends identity hex when present", () => {
    const identity = new Uint8Array(DESTINATION_IDENTITY_HASH_BYTES).map(
      (_, i) => i,
    );
    const name = expandDestinationName(identity, "app", ["a", "b"]);
    expect(name.startsWith("app.a.b.")).toBe(true);
    expect(name.endsWith("000102030405060708090a0b0c0d0e0f")).toBe(true);
  });

  it("rejects empty or dotted name parts", () => {
    expect(() => validateDestinationNamePart("", "app name")).toThrow(/empty/);
    expect(() => validateDestinationNamePart("a.b", "aspect")).toThrow(/Dots/);
  });

  it("builds deterministic name-hash material", () => {
    const material = destinationNameHashMaterial("rnstest", ["aspect"]);
    expect([...material]).toEqual([...utf8Encode("rnstest.aspect")]);
    expect(DESTINATION_NAME_HASH_BYTES).toBe(10);
  });

  it("concatenates name and identity hashes for destination material", () => {
    const nameHash = new Uint8Array(DESTINATION_NAME_HASH_BYTES).fill(1);
    const identity = new Uint8Array(DESTINATION_IDENTITY_HASH_BYTES).fill(2);
    const material = destinationHashMaterial(nameHash, identity);
    expect(material.length).toBe(
      DESTINATION_NAME_HASH_BYTES + DESTINATION_IDENTITY_HASH_BYTES,
    );
    expect([...material.subarray(0, DESTINATION_NAME_HASH_BYTES)]).toEqual([
      ...nameHash,
    ]);
    expect([...destinationHashMaterial(nameHash, null)]).toEqual([...nameHash]);
  });

  it("parses announce-handler aspect filters", () => {
    expect(parseAspectFilter("lxmf.delivery")).toEqual({
      appName: "lxmf",
      aspects: ["delivery"],
    });
    expect(parseAspectFilter("app")).toEqual({ appName: "app", aspects: [] });
    expect(parseAspectFilter("...")).toBeNull();
    expect(parseAspectFilter("")).toBeNull();
  });

  it("plans destination identity-hash resolution", () => {
    expect(planDestinationIdentityHash({ kind: "missing" })).toBe("missing");
    expect(planDestinationIdentityHash({ kind: "object" })).toBe("use-object");
    expect(
      planDestinationIdentityHash({
        kind: "bytes",
        bytesLength: DESTINATION_IDENTITY_HASH_BYTES,
      }),
    ).toBe("use-bytes");
    expect(planDestinationIdentityHash({ kind: "bytes", bytesLength: 8 })).toBe(
      "reject-length",
    );

    const missingPlan = stepDestinationIdentityHashPlanWithActions(
      initialDestinationIdentityHashPlanState(),
      {
        kind: "destination/identity-hash-plan-gate",
        identityKind: "missing",
      },
    );
    expect(shouldMissDestinationIdentityHashPlan(missingPlan.actions)).toBe(
      true,
    );
    expect(destinationIdentityHashPlanFromActions(missingPlan.actions)).toBe(
      "missing",
    );

    const objectPlan = stepDestinationIdentityHashPlanWithActions(
      initialDestinationIdentityHashPlanState(),
      {
        kind: "destination/identity-hash-plan-gate",
        identityKind: "object",
      },
    );
    expect(shouldUseObjectDestinationIdentityHashPlan(objectPlan.actions)).toBe(
      true,
    );

    const bytesPlan = stepDestinationIdentityHashPlanWithActions(
      initialDestinationIdentityHashPlanState(),
      {
        kind: "destination/identity-hash-plan-gate",
        identityKind: "bytes",
        bytesLength: DESTINATION_IDENTITY_HASH_BYTES,
      },
    );
    expect(shouldUseBytesDestinationIdentityHashPlan(bytesPlan.actions)).toBe(
      true,
    );

    const badPlan = stepDestinationIdentityHashPlanWithActions(
      initialDestinationIdentityHashPlanState(),
      {
        kind: "destination/identity-hash-plan-gate",
        identityKind: "bytes",
        bytesLength: 8,
      },
    );
    expect(shouldRejectLengthDestinationIdentityHashPlan(badPlan.actions)).toBe(
      true,
    );
  });

  it("emits identity-hash actions from destination/identity-hash-gate", () => {
    const missing = stepDestinationIdentityHashWithActions(
      initialDestinationIdentityHashState(),
      {
        kind: "destination/identity-hash-gate",
        identityKind: "missing",
      },
    );
    expect(shouldMissDestinationIdentityHash(missing.actions)).toBe(true);

    const object = stepDestinationIdentityHashWithActions(
      initialDestinationIdentityHashState(),
      {
        kind: "destination/identity-hash-gate",
        identityKind: "object",
      },
    );
    expect(shouldUseObjectDestinationIdentityHash(object.actions)).toBe(true);

    const bytes = stepDestinationIdentityHashWithActions(
      initialDestinationIdentityHashState(),
      {
        kind: "destination/identity-hash-gate",
        identityKind: "bytes",
        bytesLength: DESTINATION_IDENTITY_HASH_BYTES,
      },
    );
    expect(shouldUseBytesDestinationIdentityHash(bytes.actions)).toBe(true);

    const bad = stepDestinationIdentityHashWithActions(
      initialDestinationIdentityHashState(),
      {
        kind: "destination/identity-hash-gate",
        identityKind: "bytes",
        bytesLength: 8,
      },
    );
    expect(shouldRejectLengthDestinationIdentityHash(bad.actions)).toBe(true);
  });

  it("expands / materials / aspect-filter via WithActions", () => {
    const expanded = stepExpandDestinationNameWithActions(
      initialExpandDestinationNameState(),
      {
        kind: "destination/expand-name-gate",
        identityHash: null,
        appName: "lxmf",
        aspects: ["delivery"],
      },
    );
    expect(shouldUseExpandDestinationName(expanded.actions)).toBe(true);
    expect(expandedDestinationNameFromActions(expanded.actions)).toBe(
      "lxmf.delivery",
    );

    const badExpand = stepExpandDestinationNameWithActions(
      initialExpandDestinationNameState(),
      {
        kind: "destination/expand-name-gate",
        identityHash: null,
        appName: "",
        aspects: [],
      },
    );
    expect(shouldRejectExpandDestinationName(badExpand.actions)).toBe(true);

    const nameMaterial = stepDestinationNameHashMaterialWithActions(
      initialDestinationNameHashMaterialState(),
      {
        kind: "destination/name-hash-material-gate",
        appName: "rnstest",
        aspects: ["aspect"],
      },
    );
    expect(shouldUseDestinationNameHashMaterial(nameMaterial.actions)).toBe(
      true,
    );
    expect([
      ...destinationNameHashMaterialRawFromActions(nameMaterial.actions)!,
    ]).toEqual([...utf8Encode("rnstest.aspect")]);
    expect(shouldRejectDestinationNameHashMaterial(nameMaterial.actions)).toBe(
      false,
    );

    const nameHash = new Uint8Array(DESTINATION_NAME_HASH_BYTES).fill(1);
    const identity = new Uint8Array(DESTINATION_IDENTITY_HASH_BYTES).fill(2);
    const hashMaterial = stepDestinationHashMaterialWithActions(
      initialDestinationHashMaterialState(),
      {
        kind: "destination/hash-material-gate",
        nameHash,
        identityHash: identity,
      },
    );
    expect(shouldUseDestinationHashMaterial(hashMaterial.actions)).toBe(true);
    expect(
      destinationHashMaterialRawFromActions(hashMaterial.actions)!.length,
    ).toBe(DESTINATION_NAME_HASH_BYTES + DESTINATION_IDENTITY_HASH_BYTES);

    const parsed = stepParseAspectFilterWithActions(
      initialParseAspectFilterState(),
      {
        kind: "destination/aspect-filter-gate",
        filter: "lxmf.delivery",
      },
    );
    expect(shouldUseParseAspectFilter(parsed.actions)).toBe(true);
    expect(aspectFilterFromActions(parsed.actions)).toEqual({
      appName: "lxmf",
      aspects: ["delivery"],
    });

    const rejectedFilter = stepParseAspectFilterWithActions(
      initialParseAspectFilterState(),
      {
        kind: "destination/aspect-filter-gate",
        filter: "",
      },
    );
    expect(shouldRejectParseAspectFilter(rejectedFilter.actions)).toBe(true);
    expect(aspectFilterFromActions(rejectedFilter.actions)).toBeNull();

    const validPart = stepValidateDestinationNamePartWithActions(
      initialValidateDestinationNamePartState(),
      {
        kind: "destination/name-part-gate",
        value: "lxmf",
        label: "app name",
      },
    );
    expect(shouldProceedValidateDestinationNamePart(validPart.actions)).toBe(
      true,
    );

    const badPart = stepValidateDestinationNamePartWithActions(
      initialValidateDestinationNamePartState(),
      {
        kind: "destination/name-part-gate",
        value: "a.b",
        label: "aspect",
      },
    );
    expect(shouldRejectValidateDestinationNamePart(badPart.actions)).toBe(true);
  });
});
