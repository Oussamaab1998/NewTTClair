/**
 * Debug-only code (scripted live check, raw LLM output panel). Import it only
 * as `__DEV__ ? require('./dev') : null`: in release builds `__DEV__` is false,
 * Metro folds the branch and this module is not bundled (checked by building a
 * release bundle, docs/PROGRESS.md).
 */
export { devScenario, runLive1, runTiming, SCENARIO_CAP_USD } from './scenario';
export { LlmRawPanel } from './LlmRawPanel';
export { AiTracePanel } from './AiTracePanel';
export { fakeLlmClient } from './fakeLlm';
export { nextRightAction } from './answerAll';
export {
  devActionsAtLaunch,
  devComponentAtLaunch,
  devDemoAtLaunch,
  devPaperAtLaunch,
  devPaperScreenAtLaunch,
  devHelpLayoutAtLaunch,
  devHelpChoiceOpenAtLaunch,
  devScrollEndAtLaunch,
  devWidthAtLaunch,
  devResetAtLaunch,
  devPartAtLaunch,
  devScrollAtLaunch,
  devTabAtLaunch,
  devUntilAtLaunch,
  devThenAtLaunch,
  devScriptAtLaunch,
  devStopAtLaunch,
  devLongPressAtLaunch,
  devModeAtLaunch,
  aiEveryMistakeAtLaunch,
  devLlmAtLaunch,
  runDevBench,
} from './launch';
export { realSessionPlayer } from '../../lesson/session/fixtures/realSession1b';
