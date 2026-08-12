import { describe, expect, it } from "vitest";
import {
  RESOURCE_MAX_EFFICIENT_SIZE,
  resourceIsSplit,
  resourceSegmentCount,
  resourceSegmentRange,
} from "../src/resource-segment.js";

describe("resource segmentation", () => {
  it("pins the reference segment ceiling", () => {
    // RNS.Resource.MAX_EFFICIENT_SIZE. A transfer that stops at exactly this
    // many bytes is the signature of segmentation not happening at all.
    expect(RESOURCE_MAX_EFFICIENT_SIZE).toBe(16777215);
  });

  it("keeps payloads up to the ceiling in one segment", () => {
    expect(resourceSegmentCount(0)).toBe(1);
    expect(resourceSegmentCount(1)).toBe(1);
    expect(resourceSegmentCount(RESOURCE_MAX_EFFICIENT_SIZE)).toBe(1);
    expect(resourceIsSplit(RESOURCE_MAX_EFFICIENT_SIZE)).toBe(false);
  });

  it("splits one byte past the ceiling", () => {
    expect(resourceSegmentCount(RESOURCE_MAX_EFFICIENT_SIZE + 1)).toBe(2);
    expect(resourceIsSplit(RESOURCE_MAX_EFFICIENT_SIZE + 1)).toBe(true);
  });

  it("counts segments the way the reference does", () => {
    // ((size-1)//MAX)+1 — exact multiples must not gain an empty segment.
    expect(resourceSegmentCount(RESOURCE_MAX_EFFICIENT_SIZE * 2)).toBe(2);
    expect(resourceSegmentCount(RESOURCE_MAX_EFFICIENT_SIZE * 2 + 1)).toBe(3);
    expect(resourceSegmentCount(104857600)).toBe(7);
  });

  it("covers the payload exactly, with a short final segment", () => {
    const total = RESOURCE_MAX_EFFICIENT_SIZE * 2 + 500;
    const segments = resourceSegmentCount(total);
    let covered = 0;
    let previousEnd = 0;
    for (let index = 1; index <= segments; index += 1) {
      const { start, end } = resourceSegmentRange(total, index);
      expect(start).toBe(previousEnd);
      covered += end - start;
      previousEnd = end;
    }
    expect(covered).toBe(total);
    expect(previousEnd).toBe(total);
    expect(resourceSegmentRange(total, segments)).toEqual({
      start: RESOURCE_MAX_EFFICIENT_SIZE * 2,
      end: total,
    });
  });

  it("rejects a segment index outside the payload", () => {
    expect(() => resourceSegmentRange(1024, 0)).toThrow(/outside 1\.\.1/);
    expect(() => resourceSegmentRange(1024, 2)).toThrow(/outside 1\.\.1/);
  });

  it("rejects a negative or fractional total size", () => {
    expect(() => resourceSegmentCount(-1)).toThrow(/non-negative integer/);
    expect(() => resourceSegmentCount(1.5)).toThrow(/non-negative integer/);
  });

  it("honours an explicit segment size", () => {
    expect(resourceSegmentCount(1000, 100)).toBe(10);
    expect(resourceSegmentRange(1000, 3, 100)).toEqual({
      start: 200,
      end: 300,
    });
    expect(resourceSegmentRange(250, 3, 100)).toEqual({ start: 200, end: 250 });
    expect(() => resourceSegmentCount(1000, 0)).toThrow(/positive integer/);
  });
});
