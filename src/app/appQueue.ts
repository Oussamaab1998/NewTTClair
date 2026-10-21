/** The app's report / question queue, persisted in MMKV (created on first use). */
import { appStore } from '../storage/appStore';
import { LocalQueue } from '../telemetry/reports';

let queue: LocalQueue | null = null;

export function appQueue(): LocalQueue {
  if (!queue) {
    queue = new LocalQueue(appStore());
  }
  return queue;
}
