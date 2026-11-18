/**
 * The AI teacher (student test 2026-11-18): its own screen's answers, one
 * stateless checked call per question, a daily allowance of its own, the
 * glossary's free answers, and a free stand-in for screenshots.
 */
export type {
  TeacherAi,
  TeacherAnswer,
  TeacherBlock,
  TeacherContext,
  TeacherMode,
  TeacherRequest,
  TeacherResult,
  TeacherTurn,
} from './types';
export { TEACHER_HISTORY } from './types';
export {
  createTeacher,
  DEFAULT_TEACHER_CONFIG,
  liveTeacher,
  noTeacher,
  teacherBody,
  type TeacherCallLog,
  type TeacherConfig,
} from './teacher';
export { teacherContext } from './context';
export {
  storeTeacherAllowance,
  teacherAllowance,
  TEACHER_DAILY_USD,
  TEACHER_EXPECTED_USD,
  TEACHER_SPEND_KEY,
  type TeacherAllowance,
} from './allowance';
export {
  glossaryAnswer,
  isFrenchWords,
  pickEntry,
  richBlocks,
  type AskKind,
} from './glossary';
export { arabiziNotes } from './arabizi';
export { cannedTeacher, CANNED_ANSWER } from './canned';
export { verifyTeacher, cutTrailingQuestion } from './verify';
