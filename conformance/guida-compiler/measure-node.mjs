import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { compileGuidaWorkspace } from "../../packages/guida-twistedpear/dist/index.js";
import { collectHelloFiles } from "./hello-files.mjs";

function heapUsed() {
  return process.memoryUsage().heapUsed;
}

export async function measureNode() {
  const require = createRequire(import.meta.url);
  let peakHeapBytes = heapUsed();
  const sampler = setInterval(() => {
    peakHeapBytes = Math.max(peakHeapBytes, heapUsed());
  }, 20);
  try {
    const parseStarted = performance.now();
    require("guida");
    const coldParseMs = performance.now() - parseStarted;
    peakHeapBytes = Math.max(peakHeapBytes, heapUsed());

    const files = collectHelloFiles();
    const compileStarted = performance.now();
    const result = await compileGuidaWorkspace(files);
    const helloCompileMs = performance.now() - compileStarted;
    peakHeapBytes = Math.max(peakHeapBytes, heapUsed());

    return {
      runtime: "node",
      available: true,
      coldParseMs: Number(coldParseMs.toFixed(1)),
      helloCompileMs: Number(helloCompileMs.toFixed(1)),
      peakHeapBytes,
      minifiedBytes: result.minifiedBytes,
      compiler: result.compilerVersion,
    };
  } finally {
    clearInterval(sampler);
  }
}
