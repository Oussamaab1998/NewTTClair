/**
 * Local queue of "save a note for my teacher" notes (TUTOR_BEHAVIOR.md ladder
 * step 5). Filled from `teacher_note` events, so it holds ids only: skills,
 * misconceptions, the rule, the step. No free text, no personal data
 * (CLAUDE.md rule 8). In memory like the event log until storage is decided
 * (DECISIONS.md D2); `toJsonl()` is the export the Phase 4 report flow can reuse.
 */
import type { Event } from './events';
import type { EventLog } from './log';

export interface TeacherNote {
  noteId: string;
  ts: number;
  exerciseId: string;
  contentVersion: string;
  questionId: string;
  stepId: string;
  skillIds: string[];
  misconceptionIds: string[];
  ruleId: string;
}

export function noteFromEvent(e: Event): TeacherNote | null {
  if (e.t !== 'teacher_note') {
    return null;
  }
  return {
    noteId: e.noteId,
    ts: e.ts,
    exerciseId: e.exerciseId,
    contentVersion: e.contentVersion,
    questionId: e.questionId,
    stepId: e.stepId,
    skillIds: [...e.skillIds],
    misconceptionIds: [...e.misconceptionIds],
    ruleId: e.ruleId,
  };
}

export class TeacherNoteQueue {
  private readonly notes: TeacherNote[] = [];
  private seen = 0;

  constructor(private readonly log: Pick<EventLog, 'all' | 'subscribe'>) {
    this.sync();
    log.subscribe(() => this.sync());
  }

  private sync() {
    const events = this.log.all();
    for (; this.seen < events.length; this.seen += 1) {
      const note = noteFromEvent(events[this.seen]!);
      if (note) {
        this.notes.push(note);
      }
    }
  }

  all(): readonly TeacherNote[] {
    return this.notes;
  }

  toJsonl(): string {
    return this.notes.map(n => JSON.stringify(n)).join('\n');
  }
}
