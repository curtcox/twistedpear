import {
  compileGuidaWorkspace,
  diagnoseGuidaWorkspace,
  formatGuidaSource,
} from "../../../packages/guida-twistedpear/src/worklet.ts";

type CompileRequest = {
  readonly id: number;
  readonly op: "compile";
  readonly files: ReadonlyArray<{ path: string; content: string | Uint8Array }>;
};

type DiagnoseRequest = {
  readonly id: number;
  readonly op: "diagnose";
  readonly files: ReadonlyArray<{ path: string; content: string | Uint8Array }>;
  readonly path?: string;
};

type FormatRequest = {
  readonly id: number;
  readonly op: "format";
  readonly content: string;
};

type Request = CompileRequest | DiagnoseRequest | FormatRequest;

self.addEventListener("message", (event: MessageEvent<Request>) => {
  void handle(event.data);
});

async function handle(request: Request) {
  try {
    let result: unknown;
    if (request.op === "compile") {
      result = await compileGuidaWorkspace(request.files);
    } else if (request.op === "diagnose") {
      result = await diagnoseGuidaWorkspace(request.files, request.path);
    } else {
      result = await formatGuidaSource(request.content);
    }
    self.postMessage({ id: request.id, ok: true, result });
  } catch (error) {
    self.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

self.postMessage({ type: "ready" });
