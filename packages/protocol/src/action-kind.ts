/**
 * First action in a step-action list. Use when the caller already treats the
 * list as a single union and does not need to re-test `kind`.
 */
export function firstAction<T>(actions: ReadonlyArray<T>): T | undefined {
  return actions[0];
}

/**
 * Narrow a step-action list to the first action of a given kind.
 * Callers read fields from the narrowed action instead of re-testing `kind`.
 */
export function firstActionOfKind<
  T extends { readonly kind: string },
  K extends T["kind"],
>(
  actions: ReadonlyArray<T>,
  kind: K,
): Extract<T, { readonly kind: K }> | undefined {
  return actions.find(
    (entry): entry is Extract<T, { readonly kind: K }> => entry.kind === kind,
  );
}

export function hasActionOfKind<
  T extends { readonly kind: string },
  K extends T["kind"],
>(actions: ReadonlyArray<T>, kind: K): boolean {
  return firstActionOfKind(actions, kind) !== undefined;
}
