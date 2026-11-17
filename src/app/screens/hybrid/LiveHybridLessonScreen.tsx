/**
 * The lesson board as the app opens it: the live AI side (src/hybrid/live.ts)
 * made once per question, with the app's key and store (debug builds:
 * `-devMover slow` puts the slow, free stand-in in its place, and
 * `-devHybridActs` plays acts on the board once it is open).
 */
import React, { useState } from 'react';

import { exercisePack } from '../../../ai/tutor';
import { localLlmConfig } from '../../../config/llm';
import { liveAi } from '../../../hybrid/live';
import { appStore } from '../../../storage/appStore';
import type * as DevOnly from '../../dev';
import type * as DevLaunch from '../../dev/launch';
import {
  HybridLessonScreen,
  type HybridLessonScreenProps,
} from './HybridLessonScreen';

/** Debug builds only; `__DEV__` is false in release, so Metro drops the require. */
const devOnly: typeof DevOnly | null = __DEV__
  ? (require('../../dev') as typeof DevOnly)
  : null;

/** The launch arguments of the board's own (same rule: dropped in release). */
const devLaunch: typeof DevLaunch | null = __DEV__
  ? (require('../../dev/launch') as typeof DevLaunch)
  : null;

export function LiveHybridLessonScreen(
  p: Omit<HybridLessonScreenProps, 'mover' | 'templates'>,
) {
  const [ai] = useState(() =>
    liveAi({
      store: p.store ?? appStore(),
      apiKey: localLlmConfig().anthropicApiKey,
      exerciseId: p.loaded.exercise.id,
      questionId: p.questionId,
      notes:
        exercisePack(p.loaded, p.raw as never).questions.get(p.questionId)
          ?.notes ?? null,
      devMover: devOnly?.devMoverAtLaunch() ?? null,
    }),
  );
  const [devActs] = useState(() => devLaunch?.devHybridActsAtLaunch() ?? []);
  return (
    <HybridLessonScreen
      {...p}
      mover={ai.mover}
      templates={ai.templates}
      {...(devActs.length > 0 && { devActs })}
    />
  );
}
