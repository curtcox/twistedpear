export interface CapturedPacket {
  readonly label: string;
  readonly fields: Readonly<Record<string, string | number | boolean>>;
}

export interface CaptureMismatch {
  readonly label: string;
  readonly field: string;
  readonly expected: string | number | boolean | undefined;
  readonly actual: string | number | boolean | undefined;
}

export function diffCaptures(
  expected: ReadonlyArray<CapturedPacket>,
  actual: ReadonlyArray<CapturedPacket>,
): CaptureMismatch[] {
  const mismatches: CaptureMismatch[] = [];
  const length = Math.max(expected.length, actual.length);

  for (let index = 0; index < length; index += 1) {
    const expectedPacket = expected[index];
    const actualPacket = actual[index];
    const label =
      expectedPacket?.label ?? actualPacket?.label ?? `packet-${index}`;
    const fieldNames = new Set([
      ...Object.keys(expectedPacket?.fields ?? {}),
      ...Object.keys(actualPacket?.fields ?? {}),
    ]);

    for (const field of fieldNames) {
      const expectedValue = expectedPacket?.fields[field];
      const actualValue = actualPacket?.fields[field];
      if (expectedValue !== actualValue) {
        mismatches.push({
          label,
          field,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }
  }

  return mismatches;
}
