import { describe, expect, it } from "vitest";
import { utf8Encode } from "../src/utf8.js";
import { migrateLegacyGrantRecord } from "../src/grant-storage-migration.js";

describe("legacy grant record migration", () => {
  it("canonicalizes a valid record and rejects extras", () => {
    const canonical = migrateLegacyGrantRecord(
      utf8Encode(
        '{"appId":"demo-app","publisherPublicKey":"pk","granted":["read"],"updatedAt":1}',
      ),
    );
    expect(canonical).not.toBeNull();
    expect(
      migrateLegacyGrantRecord(
        utf8Encode(
          '{"appId":"demo-app","publisherPublicKey":"pk","granted":["read"],"updatedAt":1,"extra":true}',
        ),
      ),
    ).toBeNull();
    expect(migrateLegacyGrantRecord(utf8Encode("[]"))).toBeNull();
    expect(migrateLegacyGrantRecord(utf8Encode("{"))).toBeNull();
    expect(
      migrateLegacyGrantRecord(
        utf8Encode(
          '{"appId":"demo-app","publisherPublicKey":"pk","granted":[1],"updatedAt":1}',
        ),
      ),
    ).toBeNull();
    expect(
      migrateLegacyGrantRecord(
        utf8Encode(
          '{"appId":"demo-app","publisherPublicKey":"pk","granted":["a","a"],"updatedAt":1}',
        ),
      ),
    ).toBeNull();
  });
});
