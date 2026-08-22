import { describe, expect, it } from "vitest";
import { describeWidgetTree, validateWidgetTree } from "../src/index.js";

describe("text-input schema", () => {
  it("accepts multiline, secure, and keyboard props", () => {
    const tree = validateWidgetTree({
      root: {
        id: "field",
        type: "text-input",
        props: {
          value: "secret",
          placeholder: "pass",
          event: "change",
          multiline: true,
          secure: true,
          keyboard: "email",
        },
      },
    });
    const described = describeWidgetTree(tree);
    expect(described.component).toBe("TextInput");
    expect(described.props).toMatchObject({
      multiline: true,
      secure: true,
      keyboard: "email",
    });
  });

  it("rejects an unknown keyboard and unknown props", () => {
    expect(() =>
      validateWidgetTree({
        root: {
          id: "field",
          type: "text-input",
          props: { keyboard: "emoji" },
        },
      }),
    ).toThrow(/keyboard/);
    expect(() =>
      validateWidgetTree({
        root: {
          id: "field",
          type: "text-input",
          props: { autocorrect: false },
        },
      }),
    ).toThrow(/Unsupported/);
  });
});
