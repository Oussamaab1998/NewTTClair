/**
 * The student's class (year + section), picked once and changed from the
 * chapter list («بدّل»). Stored in the app's settings store; the onboarding
 * will write the same record when it is built.
 */
import { z } from 'zod';

import {
  SECTION_IDS,
  YEARS,
  trackFor,
} from '../../../content/curriculum';
import type { KeyValueStore } from '../../../storage/kv';
import type { StudentClass } from './chapters';

export const STUDENT_CLASS_KEY = 'student.class.v1';

const Stored = z.strictObject({
  year: z.enum(YEARS),
  section: z.enum(SECTION_IDS).nullable(),
});

/** The saved class; null when none was picked or the record is damaged or unknown. */
export function loadStudentClass(kv: KeyValueStore): StudentClass | null {
  try {
    const raw = kv.getString(STUDENT_CLASS_KEY);
    if (raw === undefined) {
      return null;
    }
    const parsed = Stored.safeParse(JSON.parse(raw));
    return parsed.success && trackFor(parsed.data.year, parsed.data.section)
      ? parsed.data
      : null;
  } catch {
    return null; // damaged data: as if never picked, never a crash
  }
}

export function saveStudentClass(kv: KeyValueStore, cls: StudentClass): void {
  kv.set(STUDENT_CLASS_KEY, JSON.stringify(cls));
}
