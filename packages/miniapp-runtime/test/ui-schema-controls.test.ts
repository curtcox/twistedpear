import { describe, expect, it } from "vitest";
import { describeWidgetTree, validateWidgetTree } from "../src/index.js";

describe("select slider date widgets", () => {
  it("accepts the closed control prop sets", () => {
    const tree = validateWidgetTree({
      root: {
        id: "root",
        type: "view",
        children: [
          {
            id: "choice",
            type: "select",
            props: { value: "a", options: ["a", "b"], event: "pick" },
          },
          {
            id: "level",
            type: "slider",
            props: { value: 4, min: 0, max: 10, step: 1, event: "slide" },
          },
          {
            id: "when",
            type: "date",
            props: { value: "2026-08-21", event: "when" },
          },
        ],
      },
    });
    const described = describeWidgetTree(tree);
    expect(described.children?.map((child) => child.component)).toEqual([
      "Select",
      "Slider",
      "Date",
    ]);
  });

  it("rejects unknown control props", () => {
    expect(() =>
      validateWidgetTree({
        root: {
          id: "s",
          type: "select",
          props: { options: [], theme: "dark" },
        },
      }),
    ).toThrow(/Unsupported/);
    expect(() =>
      validateWidgetTree({
        root: { id: "v", type: "slider", props: { value: 1, color: "red" } },
      }),
    ).toThrow(/Unsupported/);
  });
});
