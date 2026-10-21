/** The app's done-parts record (own MMKV instance), created on first use. */
import { appStore } from '../storage/appStore';
import { createDoneRecord, type DoneRecord } from '../state/doneParts';

let record: DoneRecord | null = null;

export function appDoneRecord(): DoneRecord {
  if (!record) {
    record = createDoneRecord(appStore('tteclair-progress'));
  }
  return record;
}
