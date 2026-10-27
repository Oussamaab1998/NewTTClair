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
 *
 * "Start the exercise from scratch" (`exercise_reset`): a part done in a
 * session that started before the exercise's latest reset no longer counts,
 * and the record forgets that exercise. Stored events stay (reports, planner
 * history: DECISIONS.md D25).
 */
import type { KeyValueStore } from '../storage/kv';
import type { Event } from '../telemetry/events';
import { EventLog, type LogClock } from '../telemetry/log';

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
    /** Forgets every done mark of this exercise (and only this one). */
    clearExercise(exerciseId: string) {
      const prefix = partKey(exerciseId, '');
      const all = read();
      const kept = Object.fromEntries(
        Object.entries(all).filter(([key]) => !key.startsWith(prefix)),
      );
      kv.set(RECORD_KEY, JSON.stringify(kept));
    },
  };
}
export type DoneRecord = ReturnType<typeof createDoneRecord>;

/** Each exercise's latest `exercise_reset` time. */
function latestResets(events: readonly Event[]): Map<string, number> {
  const resets = new Map<string, number>();
  for (const e of events) {
    if (e.t === 'exercise_reset') {
      resets.set(e.exerciseId, Math.max(resets.get(e.exerciseId) ?? 0, e.ts));
    }
  }
  return resets;
}

/**
 * Done part keys: the record, plus any counting `part_done` in these events;
 * minus what an exercise's latest reset wiped (a session started before it, a
 * record entry first done before it, in case clearing the record failed).
 */
export function doneParts(
  events: readonly Event[],
  record?: Pick<DoneRecord, 'all'>,
): Set<string> {
  const resets = latestResets(events);
  const sessionStart = new Map<string, number>();
  for (const e of events) {
    sessionStart.set(
      e.sessionId,
      Math.min(sessionStart.get(e.sessionId) ?? e.ts, e.ts),
    );
  }
  const afterReset = (exerciseId: string, ts: number) =>
    ts >= (resets.get(exerciseId) ?? 0);
  const done = new Set<string>();
  for (const [key, entry] of Object.entries(record?.all() ?? {})) {
    const exerciseId = key.slice(0, key.lastIndexOf('/'));
    if (afterReset(exerciseId, entry.firstDoneAt)) {
      done.add(key);
    }
  }
  for (const e of events) {
    if (
      countsAsDone(e) &&
      afterReset(e.exerciseId, sessionStart.get(e.sessionId) ?? e.ts)
    ) {
      done.add(partKey(e.exerciseId, e.questionId));
    }
  }
  return done;
}

/**
 * "Start the exercise from scratch": logs `exercise_reset` for this exercise
 * (its own short session), then clears its done marks. Nothing is deleted.
 */
export function resetExercise(
  exercise: { id: string; contentVersion: string },
  services: {
    eventStore: { append(events: readonly Event[]): void };
    doneRecord: Pick<DoneRecord, 'clearExercise'>;
    clock?: LogClock;
    /** The reset dialog's log (its events share one session); else a new one. */
    log?: EventLog;
  },
) {
  const log =
    services.log ??
    new EventLog(
      {
        sessionId: `reset-${Date.now().toString(36)}`,
        studentId: 'local-anon',
        exerciseId: exercise.id,
        contentVersion: exercise.contentVersion,
      },
      services.clock,
      services.eventStore,
    );
  log.append([
    { t: 'exercise_reset', questionId: 'exercise', stepId: 'reset' },
  ]);
  services.doneRecord.clearExercise(exercise.id);
}
