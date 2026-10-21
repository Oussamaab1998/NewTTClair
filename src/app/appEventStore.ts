/** The app's persistent event log (own MMKV instance), created on first use. */
import { appStore } from '../storage/appStore';
import { createKvEventStore, type EventStore } from '../telemetry/eventStore';

let store: EventStore | null = null;

export function appEventStore(): EventStore {
  if (!store) {
    store = createKvEventStore(appStore('tteclair-events'));
  }
  return store;
}
