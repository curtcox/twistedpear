/**
 * One wire part of a resource transfer.
 *
 * Its own module so the part builder can describe what it produces without
 * importing `shared.js`, which reaches back into the resource class and would
 * close a dependency cycle.
 */
export interface ResourcePart {
  readonly data: Uint8Array;
  readonly mapHash: Uint8Array;
  raw: Uint8Array;
  sent: boolean;
}
