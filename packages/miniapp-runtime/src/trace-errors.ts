export class AppTraceFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppTraceFormatError";
  }
}
