/**
 * The lesson board as the app opens it: the live AI side (src/hybrid/live.ts)
 * made once per question, with the app's key and store.
 */
import React, { useState } from 'react';

import { exercisePack } from '../../../ai/tutor';
import { localLlmConfig } from '../../../config/llm';
import { liveAi } from '../../../hybrid/live';
import { appStore } from '../../../storage/appStore';
import {
  HybridLessonScreen,
  type HybridLessonScreenProps,
} from './HybridLessonScreen';

export function LiveHybridLessonScreen(
  p: Omit<HybridLessonScreenProps, 'mover' | 'templates'>,
) {
  const [ai] = useState(() =>
    liveAi({
      store: p.store ?? appStore(),
      apiKey: localLlmConfig().anthropicApiKey,
      notes:
        exercisePack(p.loaded, p.raw as never).questions.get(p.questionId)
          ?.notes ?? null,
    }),
  );
  return (
    <HybridLessonScreen {...p} mover={ai.mover} templates={ai.templates} />
  );
}
