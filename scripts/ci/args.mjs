/**
 * Shared command-line argument parsing for telemetry scripts.
 */
export function parseArgs() {
  return new Map(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, "").split("=");
      return [key, rest.join("=") || "true"];
    }),
  );
}
