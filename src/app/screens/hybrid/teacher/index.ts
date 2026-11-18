/**
 * The teacher's screen and the long press to ask (student test 2026-11-18).
 * The board wires:
 *   <AskProvider exerciseId onAsk={(r: AskRequest) => ...}>...lesson...</AskProvider>
 *   <TeacherScreen visible onClose exerciseId question={{ ctx, state } | null}
 *     ai={TeacherAi} initial={AskRequest | null} onEvent? />
 * TeacherScreen fills its parent: render it as the last child of the
 * board's root view (it is not an RN Modal, so the input stays above the
 * Android keyboard; useKeyboardInset.ts).
 */
export { AskMenu, AskProvider } from './AskProvider';
export { TeacherScreen, type TeacherScreenProps } from './TeacherScreen';
export type {
  AskKind,
  AskRequest,
  TeacherEvent,
  TeacherQuestion,
} from './types';
export { liveTeacher, noTeacher, type TeacherAi } from '../../../../ai/teacher';
