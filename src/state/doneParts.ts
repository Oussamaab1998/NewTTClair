/**
 * Which parts the student has done (picker ✓ chips, «كمّل من», the «الورقة»
 * sheet). Rule (DESIGN.md §4, DATA.md "Done parts"): a part counts only when
 * one of its sessions reached the done line (`part_done`) with at least one
 * required step done by the student (`answered >= 1`). Revealed-only (every
 * step shown), abandoned (no `part_done`) and skipped (only optional practice
 * can be skipped, and it is not counted) never count. Matched by exerciseId +
 * questionId, across content versions.
 *
 * Done parts are also kept in a small record of their own, so the event log's
 * cap (oldest chunks dropped) never erases a done mark.
 */
import type { KeyValueStore } from '../storage/kv';
import type { Event } from '../telemetry/events';

export const partKey = (exerciseId: string, questionId: string) =>
  `${exerciseId}/${questionId}`;

type PartDone = Extract<Event, { t: 'part_done' }>;

export const countsAsDone = (e: Event): e is PartDone =>
  e.t === 'part_done' && e.answered >= 1;

export interface DoneEntry {
  firstDoneAt: number;
  contentVersion: string;
}

const RECORD_KEY = 'done-parts';

/** The done-parts record (MMKV `tteclair-progress` in the app; memory in tests). */
export function createDoneRecord(kv: KeyValueStore) {
  const read = (): Record<string, DoneEntry> => {
    try {
      const raw = kv.getString(RECORD_KEY);
      return raw ? (JSON.parse(raw) as Record<string, DoneEntry>) : {};
    } catch {
      return {}; // damaged data: as if empty, never a crash
    }
  };
  return {
    all: read,
    /** Records a counting `part_done` once (the first time is kept). */
    note(e: Event) {
      if (!countsAsDone(e)) {
        return;
      }
      const all = read();
      const key = partKey(e.exerciseId, e.questionId);
      if (all[key]) {
        return;
      }
      all[key] = { firstDoneAt: e.ts, contentVersion: e.contentVersion };
      kv.set(RECORD_KEY, JSON.stringify(all));
    },
  };
}
export type DoneRecord = ReturnType<typeof createDoneRecord>;

/** Done part keys: the record, plus any counting `part_done` in these events. */
export function doneParts(
  events: readonly Event[],
  record?: Pick<DoneRecord, 'all'>,
): Set<string> {
  const done = new Set(Object.keys(record?.all() ?? {}));
  for (const e of events) {
    if (countsAsDone(e)) {
      done.add(partKey(e.exerciseId, e.questionId));
    }
  }
  return done;
}
