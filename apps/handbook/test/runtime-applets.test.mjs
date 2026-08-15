/**
 * `stripAppletExports` turns an applet's authored module into a body that can
 * be run inside an `AsyncFunction`, which is how the Handbook executes an
 * applet inline when the host's CSP allows it.
 *
 * It is a pair of regular expressions over source code someone else wrote, and
 * every applet in the Handbook goes through it. Nothing tested it.
 */
import { describe, expect, it } from "vitest";

import { stripAppletExports } from "../src/runtime-applets.js";

describe("stripAppletExports", () => {
  it("unwraps an exported run function", () => {
    expect(stripAppletExports("export async function run(sdk) {}")).toBe(
      "async function run (sdk) {}",
    );
  });

  it("tolerates the spacing an author actually writes", () => {
    expect(stripAppletExports("export   async\n  function   run(sdk) {}")).toBe(
      "async function run (sdk) {}",
    );
  });

  it("removes a trailing export list", () => {
    expect(
      stripAppletExports("async function run(sdk) {}\nexport { run };"),
    ).toBe("async function run(sdk) {}\n");
  });

  it("removes every export list, not only the first", () => {
    // The trailing `\\s*` also eats the newline after a list, so two adjacent
    // exports collapse together rather than leaving a blank line behind.
    expect(
      stripAppletExports("const a = 1;\nexport { a }\nexport { a as b };"),
    ).toBe("const a = 1;\n");
  });

  it("leaves an applet that exports nothing untouched", () => {
    const source = "async function run(sdk) {\n  await sdk.host.info();\n}\n";
    expect(stripAppletExports(source)).toBe(source);
  });

  it("does not eat a string that merely mentions export", () => {
    // The replacement is textual, so this is the case worth pinning: an applet
    // that prints the word must not have its own source rewritten around it.
    const source =
      'async function run(sdk) {\n  sdk.ui.log("export { x }");\n}';
    expect(stripAppletExports(source)).toContain('sdk.ui.log("');
  });
});
