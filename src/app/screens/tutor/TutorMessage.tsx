/**
 * One tutor message: its blocks as the verifier made them safe (Arabic runs
 * with French words isolated, formulas in their own left-to-right block, his
 * own lines exactly as he wrote them), and the interactive component the
 * tutor chose, inside the message: live while it is the step, then replayed
 * as he left it (never re-shown in a mode that would reveal more).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { RenderBlock } from '../../../ai/verify/message';
import { ComponentHost } from '../../../components/ComponentHost';
import type {
  ComponentEvent,
  ComponentHandle,
  ComponentResult,
} from '../../../components/contract';
import { RichView } from '../../../lesson/feed/RichView';
import { ScrollingMath } from '../../../lesson/math/ScrollingMath';
import { lineLatex } from '../../../method/lineChain';
import { theme } from '../../../theme';
import type { ThreadComponent } from './useTutorSession';

function HisLine({ raw }: { raw: string }) {
  return (
    <View style={styles.line}>
      <ScrollingMath latex={lineLatex(raw)} />
    </View>
  );
}

export interface LiveComponent {
  onEvent: (e: ComponentEvent) => void;
  onResult: (r: ComponentResult) => void;
  handle: React.RefObject<ComponentHandle | null>;
}

export function TutorMessage({
  id,
  blocks,
  component,
  live,
}: {
  id: string;
  blocks: RenderBlock[];
  component: ThreadComponent | null;
  /** Callbacks for the component when it is the current step. */
  live: LiveComponent | null;
}) {
  return (
    <View style={styles.card} testID="tutor-message">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'ar':
            return <RichView key={i} rich={{ ar: b.runs }} />;
          case 'fr':
            return <RichView key={i} rich={{ fr: b.text }} variant="paper" />;
          case 'math':
            return <RichView key={i} rich={{ math: b.latex }} />;
          case 'student_line':
            return <HisLine key={i} raw={b.raw} />;
          case 'compare':
            return (
              <View key={i} style={styles.compare}>
                <HisLine raw={b.lines[0].raw} />
                <HisLine raw={b.lines[1].raw} />
              </View>
            );
        }
      })}
      {component && (
        <View style={styles.component} testID="tutor-component">
          <ComponentHost
            spec={{
              component: component.view.name,
              props: component.view.props as never,
            }}
            defaultInstanceId={`ai-${id}`}
            mode={!component.done && live ? 'interactive' : 'replay'}
            {...(component.view.experiment && {
              experiment: component.view.experiment,
            })}
            {...(component.done &&
              component.snapshot && { snapshot: component.snapshot })}
            onEvent={live && !component.done ? live.onEvent : () => {}}
            {...(live &&
              !component.done && {
                onResult: live.onResult,
                handleRef: live.handle,
              })}
            onError={() => {}}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surfaceCard,
    borderColor: theme.color.borderDefault,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.card,
    padding: theme.space.xxl,
    gap: theme.space.sm,
  },
  line: {
    borderColor: theme.color.actionPrimary,
    borderWidth: theme.border.thin,
    borderRadius: theme.radius.chip,
    paddingVertical: theme.space.xs,
    paddingHorizontal: theme.space.md,
    alignSelf: 'stretch',
  },
  compare: { gap: theme.space.xs },
  component: { marginTop: theme.space.sm },
});
