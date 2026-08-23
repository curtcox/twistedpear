import { describe, expect, it } from "vitest";
import { linkJsModules, needsJsLink } from "../src/js-link.mjs";

describe("JavaScript worklet linker", () => {
  it("detects relative imports", () => {
    expect(needsJsLink("export const value = 1;")).toBe(false);
    expect(needsJsLink("import value from './value.js';")).toBe(true);
  });

  it("normalizes paths, follows extensions, and rewrites named imports", () => {
    const files = new Map([
      [
        "entry/main.js",
        "import { value as answer } from '../shared/value';\r\nexport const result = answer;",
      ],
      ["shared/value.mjs", "export const value = 42;"],
    ]);

    const linked = linkJsModules(files, "entry/main.js");

    expect(linked).toContain("const answer = __m0.value;");
    expect(linked).toContain("const value = 42;");
    expect(linked).toContain("const __entry = __m1;");
  });

  it("rewrites namespace imports and exported declarations", () => {
    const files = new Map([
      [
        "main.mjs",
        "import * as dep from './dep.js';\nexport function run() { return dep.value; }",
      ],
      ["dep.js", "export const value = 'ready';"],
    ]);

    const linked = linkJsModules(files, "main.mjs");

    expect(linked).toContain("const dep = __m0;");
    expect(linked).toContain("function run()");
    expect(linked).toContain("__m1.run = run;");
  });

  it("rejects missing modules and unresolved imports", () => {
    expect(() => linkJsModules(new Map(), "main.js")).toThrow(
      "Missing module main.js",
    );
    expect(() =>
      linkJsModules(
        new Map([["main.js", "import value from './missing.js';"]]),
        "main.js",
      ),
    ).toThrow("Unresolved relative import ./missing.js from main.js");
  });

  it("rejects circular module graphs", () => {
    const files = new Map([
      ["a.js", "import { b } from './b.js';\nexport const a = b;"],
      ["b.js", "import { a } from './a.js';\nexport const b = a;"],
    ]);

    expect(() => linkJsModules(files, "a.js")).toThrow(
      "Circular import involving a.js",
    );
  });
});
