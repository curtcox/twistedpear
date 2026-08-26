import { describe, expect, it } from "vitest";
import { TopicLogStore } from "../src/index.js";

describe("topic log hostile ingest", () => {
  it("drops a forged local-author entry", () => {
    const store = new TopicLogStore({ authorId: "self" });
    store.open("board");
    store.append("board", "mine");
    const result = store.ingest("board", [
      {
        authorId: "self",
        seq: 2,
        at: 9,
        payload: "forged",
      },
    ]);
    expect(result.rejected[0]?.reason).toBe("forged-author");
    expect(store.entries("board").map((entry) => entry.payload)).toEqual([
      "mine",
    ]);
  });

  it("caps a flooding peer without dropping other authors", () => {
    const store = new TopicLogStore({ authorId: "self", authorCap: 2 });
    store.open("board");
    store.append("board", "keep");
    const flood = Array.from({ length: 6 }, (_, seq) => ({
      authorId: "peer",
      seq: seq + 1,
      at: seq + 1,
      payload: seq,
    }));
    store.ingest("board", flood, { fromAuthorId: "peer" });
    const entries = store.entries("board");
    expect(entries.filter((entry) => entry.authorId === "self")).toHaveLength(
      1,
    );
    expect(entries.filter((entry) => entry.authorId === "peer")).toHaveLength(
      2,
    );
    expect(store.windows("board").peer).toEqual({ minSeq: 5, maxSeq: 6 });
  });

  it("isolates two apps onto separate topic stores", () => {
    const alpha = new TopicLogStore({ authorId: "app-a" });
    const beta = new TopicLogStore({ authorId: "app-b" });
    alpha.open("board");
    beta.open("board");
    alpha.set("board", "secret", "alpha");
    expect(beta.view("board").has("secret")).toBe(false);
  });
});
