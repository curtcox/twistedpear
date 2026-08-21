import { compileHello } from "./engine-core.js";

const heap = () => performance.memory?.usedJSHeapSize ?? 0;

function resourceDuration(suffix) {
  const entry = performance
    .getEntriesByType("resource")
    .find((item) => item.name.endsWith(suffix));
  return entry === undefined ? 0 : Number(entry.duration.toFixed(1));
}

const listed = await fetch("./files.json").then((response) => response.json());
try {
  const compiled = await compileHello(
    globalThis.GuidaLib,
    listed,
    XMLHttpRequest,
    heap,
  );
  window.__result = {
    runtime: "chromium",
    available: true,
    coldParseMs: resourceDuration("guida.js"),
    ...compiled,
  };
  window.__done = true;
  try {
    const cookbook = await fetch("./files-cookbook.json").then((response) =>
      response.json(),
    );
    const larger = await compileHello(
      globalThis.GuidaLib,
      cookbook,
      XMLHttpRequest,
      heap,
    );
    window.__result = {
      ...window.__result,
      cookbookCompileMs: larger.helloCompileMs,
    };
  } catch {
    // Cookbook-sized compile is extra evidence, not a requirement for hello.
  }
} catch (error) {
  window.__result = {
    runtime: "chromium",
    available: false,
    coldParseMs: resourceDuration("guida.js"),
    error: error instanceof Error ? error.message.slice(0, 800) : String(error),
  };
}
window.__done = true;
