/**
 * Pure link MTU→MDU conversion and hop-matching decisions.
 */

export const LINK_MDU_HEADER_MAX = 18;
export const LINK_MDU_IFAC_MIN = 0;
export const LINK_MDU_TOKEN_OVERHEAD = 48;
export const LINK_MDU_BLOCK_SIZE = 16;

export function computeLinkMdu(mtu: number): number {
  return (
    Math.floor(
      (mtu - LINK_MDU_IFAC_MIN - LINK_MDU_HEADER_MAX - LINK_MDU_TOKEN_OVERHEAD) /
        LINK_MDU_BLOCK_SIZE
    ) *
      LINK_MDU_BLOCK_SIZE -
    1
  );
}

export function linkHopsMatch(input: {
  readonly expectedHops: number | null;
  readonly packetHops: number;
  readonly pathfinderMaxHops: number;
}): boolean {
  if (input.expectedHops === null) {
    return true;
  }
  return (
    input.packetHops === input.expectedHops ||
    input.expectedHops === input.pathfinderMaxHops
  );
}
