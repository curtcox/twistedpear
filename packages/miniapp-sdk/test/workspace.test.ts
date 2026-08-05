import { describe, expect, it } from "vitest";
import { patch } from "../src/workspace.js";
import { setMiniappHostTransport } from "../src/rpc.js";

describe("workspace SDK", () => {
  it("forwards bounded text edits through the workspace capability", async () => {
    setMiniappHostTransport({
      async request(request) {
        expect(request).toMatchObject({
          namespace: "workspace",
          method: "patch",
          capability: "workspace",
          payload: {
            path: "app/bundle.js",
            baseLength: 5,
            edits: [{ start: 1, end: 4, text: "i" }]
          }
        });
        return { id: request.id, ok: true, result: { path: "app/bundle.js", size: 3 } };
      }
    });
    await expect(patch("app/bundle.js", 5, [{ start: 1, end: 4, text: "i" }]))
      .resolves.toEqual({ path: "app/bundle.js", size: 3 });
  });
});
