/**
 * Pure RNS resource segmentation arithmetic.
 *
 * A single Reticulum resource carries at most `RESOURCE_MAX_EFFICIENT_SIZE`
 * bytes. Larger payloads are split into segments that share one
 * `originalHash`, each advertised and proven on its own, and concatenated by
 * the receiver in segment order. The constant and the segment count mirror
 * `RNS.Resource` in the pinned Python reference (`MAX_EFFICIENT_SIZE`,
 * `total_segments`); changing either breaks wire compatibility.
 */

export const RESOURCE_MAX_EFFICIENT_SIZE = 16 * 1024 * 1024 - 1;

function checkedMaxSize(maxSize: number): number {
  if (!Number.isInteger(maxSize) || maxSize < 1) {
    throw new Error("resource segment size must be a positive integer");
  }
  return maxSize;
}

/** Segments needed to carry `totalSize` bytes. Empty payloads still take one. */
export function resourceSegmentCount(
  totalSize: number,
  maxSize: number = RESOURCE_MAX_EFFICIENT_SIZE,
): number {
  if (!Number.isInteger(totalSize) || totalSize < 0) {
    throw new Error("resource total size must be a non-negative integer");
  }
  const limit = checkedMaxSize(maxSize);
  if (totalSize <= limit) {
    return 1;
  }
  return Math.floor((totalSize - 1) / limit) + 1;
}

/** Whether a payload of `totalSize` bytes is carried as split segments. */
export function resourceIsSplit(
  totalSize: number,
  maxSize: number = RESOURCE_MAX_EFFICIENT_SIZE,
): boolean {
  return resourceSegmentCount(totalSize, maxSize) > 1;
}

/**
 * Byte range of the 1-based `segmentIndex` within a `totalSize` payload.
 * The final segment is short whenever the size is not an exact multiple.
 */
export function resourceSegmentRange(
  totalSize: number,
  segmentIndex: number,
  maxSize: number = RESOURCE_MAX_EFFICIENT_SIZE,
): { readonly start: number; readonly end: number } {
  const segments = resourceSegmentCount(totalSize, maxSize);
  if (
    !Number.isInteger(segmentIndex) ||
    segmentIndex < 1 ||
    segmentIndex > segments
  ) {
    throw new Error(
      `resource segment index ${segmentIndex} is outside 1..${segments}`,
    );
  }
  if (segments === 1) {
    return { start: 0, end: totalSize };
  }
  const start = (segmentIndex - 1) * checkedMaxSize(maxSize);
  return { start, end: Math.min(start + maxSize, totalSize) };
}
