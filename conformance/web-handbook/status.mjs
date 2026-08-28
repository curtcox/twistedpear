export const WEB_HANDBOOK_TERMINAL_STATUSES = Object.freeze(["done", "error"]);

export function assertWebHandbookDone(result) {
  if (result?.status === "error") {
    throw new Error(`web handbook failed: ${JSON.stringify(result)}`);
  }
  if (result?.status !== "done") {
    throw new Error(`web handbook incomplete: ${JSON.stringify(result)}`);
  }
}
