import { describe, expect, it } from "vitest";
import { wrapGuidaScope } from "../src/wrap-scope.js";

const FAKE_GUIDA = `(function(scope){
scope.Elm = { Main: { init: function () { return { ports: { tpOut: { subscribe: function () {} }, tpIn: { send: function () {} } } }; } } };
}(this));`;

describe("wrapGuidaScope", () => {
  it("throws when the Elm scope tail is missing", () => {
    expect(() => wrapGuidaScope("var x = 1;")).toThrow(/missing trailing/);
  });

  it("strips the HTML try/catch wrapper Elm puts around index.html output", () => {
    const wrapped = wrapGuidaScope(`try {\n${FAKE_GUIDA}\n} catch (e) { throw e; }`);
    expect(wrapped).not.toContain("try {");
    const Elm = new Function(`${wrapped}\nreturn Elm;`)();
    expect(Elm.Main.init).toBeTypeOf("function");
  });

  it("exposes Elm in sloppy Function evaluation", () => {
    const wrapped = wrapGuidaScope(FAKE_GUIDA);
    const Elm = new Function(`${wrapped}\nreturn Elm;`)();
    expect(Elm.Main.init).toBeTypeOf("function");
  });

  it("exposes Elm when `this` is undefined (ES module evaluation)", async () => {
    const wrapped = wrapGuidaScope(FAKE_GUIDA);
    const moduleSource = `${wrapped}\nexport { Elm };`;
    const url = `data:text/javascript,${encodeURIComponent(moduleSource)}`;
    const imported = (await import(url)) as { Elm: { Main: { init: unknown } } };
    expect(imported.Elm.Main.init).toBeTypeOf("function");
  });
});
