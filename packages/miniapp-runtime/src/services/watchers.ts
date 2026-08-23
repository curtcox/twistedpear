export function notifyWatchers<T>(
  watchers: ReadonlyMap<string, ReadonlySet<(value: T) => void>>,
  key: string,
  value: T,
): void {
  for (const handler of watchers.get(key) ?? []) handler(value);
}

export function addWatcher<T>(
  watchers: Map<string, Set<(value: T) => void>>,
  key: string,
  handler: (value: T) => void,
): () => void {
  const bucket = watchers.get(key) ?? new Set();
  bucket.add(handler);
  watchers.set(key, bucket);
  return () => {
    bucket.delete(handler);
    if (bucket.size === 0) watchers.delete(key);
  };
}
