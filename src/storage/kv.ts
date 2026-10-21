/**
 * Small persistent key-value store (DECISIONS.md D2: MMKV for small settings
 * and queues; the event log itself is still in memory). Tests use the memory
 * version; the app uses MMKV (./appStore.ts).
 */
export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getString: key => data.get(key),
    set: (key, value) => {
      data.set(key, value);
    },
    remove: key => {
      data.delete(key);
    },
  };
}
