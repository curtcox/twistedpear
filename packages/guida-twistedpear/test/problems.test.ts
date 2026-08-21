import { describe, expect, it } from "vitest";
import {
  diagnoseGuidaMemory,
  formatGuidaMemory,
} from "../src/compile-memory.js";
import {
  extractFormatted,
  flattenGuidaDiagnostics,
  problemFromError,
} from "../src/problems.js";

describe("Guida diagnostic flattening", () => {
  it("reads Elm-shaped compile errors", () => {
    const problems = flattenGuidaDiagnostics({
      type: "compile-errors",
      errors: [
        {
          path: "src/Main.elm",
          name: "TYPE MISMATCH",
          problems: [
            {
              title: "TYPE MISMATCH",
              region: {
                start: { line: 12, column: 5 },
                end: { line: 12, column: 10 },
              },
              message: [
                "This is ",
                { bold: true, string: "Int" },
                " not String.",
              ],
            },
          ],
        },
      ],
    });
    expect(problems).toEqual([
      {
        path: "src/Main.elm",
        title: "TYPE MISMATCH",
        startLine: 12,
        startColumn: 5,
        endLine: 12,
        endColumn: 10,
        message: "This is Int not String.",
      },
    ]);
  });

  it("caps the problem list and wraps thrown errors", () => {
    const many = flattenGuidaDiagnostics(
      Array.from({ length: 40 }, (_, index) => ({
        path: `src/F${index}.elm`,
        title: "ERROR",
        region: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
        message: "x",
      })),
    );
    expect(many).toHaveLength(32);
    expect(problemFromError(new Error("boom")).message).toBe("boom");
  });

  it("extracts formatted source from string or object results", () => {
    expect(extractFormatted("module Main exposing (main)\n")).toContain(
      "module Main",
    );
    expect(extractFormatted({ content: "formatted" })).toBe("formatted");
    expect(extractFormatted({ source: "from-source" })).toBe("from-source");
    expect(extractFormatted({ output: "from-output" })).toBe("from-output");
  });

  it("returns original source when Guida says it is already formatted", async () => {
    await expect(
      formatGuidaMemory({
        format: async () => ({ type: "already-formatted" }),
        content: "module Main exposing (main)\n",
        files: [],
        vendorFiles: {},
        homeFiles: {},
      }),
    ).resolves.toBe("module Main exposing (main)\n");
  });

  it("diagnose and format memory helpers call through the injected library", async () => {
    const problems = await diagnoseGuidaMemory({
      diagnostics: async () => ({
        errors: [
          {
            path: "src/Main.elm",
            title: "SYNTAX",
            region: {
              start: { line: 3, column: 1 },
              end: { line: 3, column: 4 },
            },
            message: "bad",
          },
        ],
      }),
      files: [],
      vendorFiles: {},
      homeFiles: {},
    });
    expect(problems).toMatchObject([
      { path: "src/Main.elm", title: "SYNTAX", startLine: 3, message: "bad" },
    ]);
    await expect(
      formatGuidaMemory({
        format: async (_config, content) => content.trim(),
        content: "  x  ",
        files: [],
        vendorFiles: {},
        homeFiles: {},
      }),
    ).resolves.toBe("x");
  });
});
