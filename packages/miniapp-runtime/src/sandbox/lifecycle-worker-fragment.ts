/**
 * Worker-side checkpoint helpers spliced into sandbox bootstraps.
 * `post` is `parentPort.postMessage` or `self.postMessage`.
 * Resume errors call `reportAppError` when the app-error fragment is present.
 */
export function lifecycleWorkerFragment(post: string): string {
  return `let checkpointBlob = null;
let resumeHandler = null;
const MAX_CHECKPOINT_BYTES = 65536;
const lifecycleHost = {
  setCheckpoint: (bytes) => {
    if (bytes == null) { checkpointBlob = null; return; }
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (view.byteLength > MAX_CHECKPOINT_BYTES) throw new Error("CHECKPOINT_TOO_LARGE");
    checkpointBlob = view;
  },
  onResume: (handler) => { resumeHandler = handler; },
  getCheckpoint: () => checkpointBlob
};
function handleLifecycleMessage(message) {
  if (message.type !== "lifecycle") return false;
  if (message.state === "will-suspend") {
    ${post}({ type: "checkpoint-ack", blob: checkpointBlob == null ? null : Array.from(checkpointBlob) });
    return true;
  }
  if (message.state === "running" && resumeHandler !== null) {
    const delivered = message.checkpoint == null ? checkpointBlob : new Uint8Array(message.checkpoint);
    void Promise.resolve(resumeHandler(delivered)).catch(function (error) {
      if (typeof reportAppError === "function") reportAppError("lifecycle", error);
    });
  }
  return true;
}
`;
}
