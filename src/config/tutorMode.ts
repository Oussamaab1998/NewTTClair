/**
 * Which lesson leads a question that a tutor can lead (plan v2):
 * - 'hybrid': the lesson board, run by the conductor (engine + prepared
 *   replies), with the AI only at the moments that need it (the default);
 * - 'ai': the AI-led chat (src/app/screens/tutor), kept for comparison;
 * - 'old': the scripted lesson.
 * Debug builds choose it at launch (`-devTutorMode hybrid|ai|old`, and
 * `-devLesson old` as before); release builds always use the default.
 */
export const TUTOR_MODES = ['hybrid', 'ai', 'old'] as const;
export type TutorMode = (typeof TUTOR_MODES)[number];

export const DEFAULT_TUTOR_MODE: TutorMode = 'hybrid';

export const isTutorMode = (v: unknown): v is TutorMode =>
  typeof v === 'string' && (TUTOR_MODES as readonly string[]).includes(v);

/** The mode of this run: the launch choice (debug builds only), else the default. */
export function tutorMode(
  launch: { mode: TutorMode | null; oldLesson: boolean } | null = null,
): TutorMode {
  if (launch?.mode) {
    return launch.mode;
  }
  return launch?.oldLesson ? 'old' : DEFAULT_TUTOR_MODE;
}
