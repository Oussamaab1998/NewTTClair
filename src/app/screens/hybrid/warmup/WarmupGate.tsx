/**
 * Shows an exercise's warm-up once, before the whole exercise (owner,
 * 2026-11-17), then the lesson. Seen = done or skipped, kept in his profile
 * (`warmups`); «ابدا من جديد» forgets it with the rest of the exercise. The
 * answers become evidence on his skills and lines for the tutor
 * (applyWarmup, profileDigest). An exercise with no warm-up opens at once.
 */
import React, { useState } from 'react';

import {
  applyWarmup,
  emptyProfile,
  loadProfile,
  saveProfile,
  warmupSeen,
} from '../../../../ai/profile/profile';
import type { Rich, Warmup } from '../../../../content/schema';
import type { KeyValueStore } from '../../../../storage/kv';
import { appStore } from '../../../../storage/appStore';
import type { WarmupAct } from '../../../../warmup/warmup';
import { WarmupScreen } from './WarmupScreen';

export interface WarmupGateProps {
  exerciseId: string;
  warmup: Warmup | undefined;
  title: Rich;
  onBack: () => void;
  children: React.ReactNode;
  store?: KeyValueStore;
  /** Debug builds: `-devWarmup off` skips it; `-devWarmupActs` plays acts. */
  skip?: boolean;
  acts?: readonly WarmupAct[];
}

export function WarmupGate(p: WarmupGateProps) {
  const [store] = useState(() => p.store ?? appStore());
  const [seen, setSeen] = useState(
    () =>
      p.skip === true ||
      !p.warmup ||
      warmupSeen(loadProfile(store), p.exerciseId),
  );
  if (seen || !p.warmup) {
    return <>{p.children}</>;
  }
  return (
    <WarmupScreen
      title={p.title}
      warmup={p.warmup}
      onBack={p.onBack}
      {...(p.acts && { acts: p.acts })}
      onDone={answers => {
        const now = Date.now();
        const profile = loadProfile(store) ?? emptyProfile(now);
        saveProfile(store, applyWarmup(profile, p.exerciseId, answers, now));
        setSeen(true);
      }}
    />
  );
}
