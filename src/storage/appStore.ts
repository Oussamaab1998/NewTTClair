/**
 * The app's MMKV instance (react-native-mmkv 4, pinned). Created on first use
 * so modules that only import types never touch native code.
 */
import { createMMKV, type MMKV } from 'react-native-mmkv';

import type { KeyValueStore } from './kv';

const instances = new Map<string, MMKV>();

/** `id`: one MMKV instance per use ('tteclair' settings and queues, 'tteclair-events' the event log). */
export function appStore(id = 'tteclair'): KeyValueStore {
  let mmkv = instances.get(id);
  if (!mmkv) {
    mmkv = createMMKV({ id });
    instances.set(id, mmkv);
  }
  return {
    getString: key => mmkv!.getString(key),
    set: (key, value) => mmkv!.set(key, value),
    remove: key => {
      mmkv!.remove(key);
    },
  };
}
