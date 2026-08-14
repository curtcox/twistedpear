export class LinkServiceError extends Error {
  constructor(
    readonly code:
      | "LINK_BAD_REQUEST"
      | "LINK_PROBE_RATE_LIMITED"
      | "LINK_PROBE_DENIED"
      | "LINK_UNCONFIGURED",
    message: string,
  ) {
    super(message);
    this.name = "LinkServiceError";
  }
}
