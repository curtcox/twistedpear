import { describe, expect, it } from "vitest";
import {
  LXMF_APP_NAME,
  LXMF_MESSAGE_GET_PATH,
  LXMF_OFFER_REQUEST_PATH,
  LxmfField,
  LxmfUnverifiedReason,
} from "../src/lxmf-fields.js";

describe("lxmf fields / paths", () => {
  it("exposes app name and peer request paths", () => {
    expect(LXMF_APP_NAME).toBe("lxmf");
    expect(LXMF_MESSAGE_GET_PATH).toBe("/get");
    expect(LXMF_OFFER_REQUEST_PATH).toBe("/offer");
  });

  it("exposes field and unverified-reason codes", () => {
    expect(LxmfField.FILE_ATTACHMENTS).toBe(0x05);
    expect(LxmfField.DEBUG).toBe(0xff);
    expect(LxmfUnverifiedReason.SOURCE_UNKNOWN).toBe(0x01);
    expect(LxmfUnverifiedReason.SIGNATURE_INVALID).toBe(0x02);
  });
});
