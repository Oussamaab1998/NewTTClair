/**
 * Demo-only (dev tabs): real lesson feeds after scripted actions, through the
 * real reducer and rules planner, so tapped states (a wrong answer, a deep
 * dive, a done card) can be screenshotted without tap automation.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { createRulesPlanner } from '../../planner/rules';
import { AskField } from '../../lesson/feed/AskField';
import { LessonFeed, type FeedHandlers } from '../../lesson/feed/LessonFeed';
import { SnapshotRegistry } from '../../lesson/feed/snapshots';
import { buildContent, startLesson } from '../../lesson/session/lesson';
import { stepSync } from '../../lesson/session/orchestrate';
import type { LessonAction } from '../../lesson/session/types';
import { EventLog, fixedClock } from '../../telemetry/log';
import { theme } from '../../theme';
import { CATALOG, findPart } from '../exercises';

type ActionInput = LessonAction extends infer A
  ? A extends LessonAction
    ? Omit<A, 'at'>
    : never
  : never;

const noop = () => undefined;
const HANDLERS: FeedHandlers = {
  onSelect: noop,
  onSubmitTyped: noop,
  onSubmitLine: noop,
  onLinesInput: noop,
  onNotSure: noop,
  onHint: noop,
  onReveal: noop,
  onBack: noop,
  onSkip: noop,
  onRequest: noop,
  onComponentEvent: noop,
  onComponentResult: noop,
  onComponentError: noop,
  onCardMenu: noop,
  onLongPress: noop,
  onCardChoice: noop,
  onBlockMenu: noop,
  onReport: noop,
};

/** The part's content and feed items after `actions`. */
function scripted(part: string, actions: readonly ActionInput[]) {
  const opened = findPart(part);
  const entry = CATALOG.find(e => e.id === opened?.exerciseId);
  if (!opened || !entry?.result.ok) {
    return null;
  }
  const loaded = entry.result.loaded;
  const content = buildContent(loaded, part);
  const log = new EventLog(
    {
      sessionId: 'demo',
      studentId: 'demo',
      exerciseId: loaded.exercise.id,
      contentVersion: loaded.exercise.contentVersion,
    },
    fixedClock(),
  );
  const planner = createRulesPlanner(content.menu);
  const start = startLesson(content);
  log.append(start.events);
  let state = start.state;
  actions.forEach((a, i) => {
    // Spaced in time: never "suspiciously fast" for the planner.
    const at = (i + 1) * 20000;
    state = stepSync(
      content,
      state,
      { ...a, at } as LessonAction,
      log,
      planner,
    );
  });
  return { content, items: state.items };
}

interface FeedDemoProps {
  part: string;
  actions: readonly ActionInput[];
  /** Show the feed from the first item of this kind (the scripted part). */
  from: 'student' | 'question';
  /** A fixed width (390 / 360 pt checks; shown in a full-bleed section). */
  width?: number;
  /** Also the ask bar under the feed, chips open (row height checks). */
  askBar?: boolean;
}

export function FeedDemo({
  part,
  actions,
  from,
  width,
  askBar = false,
}: FeedDemoProps) {
  const [snapshots] = React.useState(() => new SnapshotRegistry());
  const run = useMemo(() => scripted(part, actions), [part, actions]);
  if (!run) {
    return null;
  }
  const first = run.items.findIndex(i => i.kind === from);
  const items = run.items.slice(Math.max(0, first));
  const frame = (
    <View style={[styles.frame, width !== undefined && { width }]}>
      <LessonFeed
        items={items}
        content={run.content}
        handlers={HANDLERS}
        snapshots={snapshots}
      />
      {askBar && (
        <AskField
          chips={run.content.question.askChips ?? []}
          onChip={noop}
          onSend={noop}
        />
      )}
    </View>
  );
  return frame;
}

const styles = StyleSheet.create({
  frame: {
    height: theme.size.demoFeedHeight,
    backgroundColor: theme.color.paper,
  },
});
