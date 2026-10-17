import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  ComponentHost,
  type ComponentErrorReason,
} from '../../components/ComponentHost';
import type {
  ComponentEvent,
  ComponentHandle,
  ComponentResult,
} from '../../components/contract';
import { keypadFor, stepKey } from '../../content/loader';
import type { Experiment } from '../../engine/calls';
import type { FrameStep } from '../session/lesson';
import type { FeedItemOf, RequestKind, SkipReason } from '../session/types';
import { CardMemoryContext } from './cardMemory';
import { LevelLabel } from './Bubbles';
import { NumericKeypad } from './NumericKeypad';
import { OptionsQuestion } from './OptionsQuestion';
import { RichView } from './RichView';
import { theme } from '../../theme';

export interface QuestionHandlers {
  onSelect: (optionId: string) => void;
  onSubmitTyped: (raw: string, keys: string[]) => void;
  onNotSure: () => void;
  onHint: () => void;
  onReveal: () => void;
  onBack: () => void;
  onSkip: (reason: SkipReason) => void;
  /** "غيّر الطريقة" / "حاجة أسهل" (main and variant cards). */
  onRequest: (kind: RequestKind) => void;
  /** Keypad height on screen (dev perf panel). */
  onKeypadHeight?: (height: number) => void;
  /** Component interactions (logged, never stored in lesson state: no feed re-render). */
  onComponentEvent: (stepId: string, e: ComponentEvent) => void;
  onComponentResult: (r: ComponentResult) => void;
  onComponentError: (
    stepId: string,
    component: string,
    reason: ComponentErrorReason,
    detail: string,
  ) => void;
}

interface QuestionCardProps extends QuestionHandlers {
  item: FeedItemOf<'question'>;
  step: FrameStep;
  experiment?: Experiment;
}

/**
 * The active question (always last in the feed), or a readonly copy once it is
 * done or paused by a deep dive. Footer: hint ladder (n/3), dashed "ما نعرفش",
 * the answer only at the end of the ladder, and "back" inside deep dives.
 */
export const QuestionCard = memo(function QuestionCardImpl({
  item,
  step,
  experiment,
  ...h
}: QuestionCardProps) {
  const { t } = useTranslation();
  const active = item.status === 'active';
  const hintsLeft = item.hintLevel < item.hintCount;
  const testID = `question-${item.status}`;
  const { onComponentEvent, onComponentError } = h;
  const stepId = step.id;
  const onEvent = useCallback(
    (e: ComponentEvent) => onComponentEvent(stepId, e),
    [onComponentEvent, stepId],
  );
  const onError = useCallback(
    (component: string, reason: ComponentErrorReason, detail: string) =>
      onComponentError(stepId, component, reason, detail),
    [onComponentError, stepId],
  );

  // Restore what was done on the paused card of this step (deep dive).
  const memory = useContext(CardMemoryContext);
  const memoryKey =
    item.ref.scope === 'main'
      ? stepKey.main(item.ref.questionId, item.ref.stepId)
      : item.ref.scope === 'mini'
      ? stepKey.mini(item.ref.deepDiveId)
      : stepKey.variant(item.ref.variantId);
  const canRequest = item.ref.scope !== 'mini';
  const handle = useRef<ComponentHandle>(null);
  const [restored] = useState(() =>
    active ? memory?.restore(memoryKey, item.key) : undefined,
  );
  useEffect(() => {
    memory?.register(memoryKey, item.key, handle);
    return () => memory?.unregister(memoryKey, item.key);
  }, [memory, memoryKey, item.key]);
  const [skipOpen, setSkipOpen] = useState(false);
  const restoredRaw =
    typeof restored?.raw === 'string' ? restored.raw : undefined;

  return (
    <View
      style={[styles.card, !active && styles.inactive]}
      testID={testID}
      accessibilityState={{ disabled: !active }}
    >
      {step.prompt && <RichView rich={step.prompt} />}
      {step.kind === 'component' ? (
        <ComponentHost
          spec={step.component}
          defaultInstanceId={step.blockId}
          mode={active ? 'interactive' : 'readonly'}
          {...(experiment && { experiment })}
          onEvent={onEvent}
          onResult={h.onComponentResult}
          onError={onError}
          showSolution={item.revealed ?? false}
          handleRef={handle}
          {...(restored && { snapshot: restored })}
        />
      ) : step.kind === 'choice' ? (
        <OptionsQuestion
          options={step.options.map(o => ({
            id: o.id,
            label: o.label ?? { math: '?' },
          }))}
          readonly={!active}
          {...(item.result && { result: item.result })}
          onSelect={h.onSelect}
        />
      ) : (
        <NumericKeypad
          readonly={!active}
          kind={keypadFor(step)}
          {...(item.result?.raw !== undefined && { value: item.result.raw })}
          {...(restoredRaw !== undefined && { initialRaw: restoredRaw })}
          {...(h.onKeypadHeight && { onHeight: h.onKeypadHeight })}
          onSubmit={h.onSubmitTyped}
          ref={handle}
        />
      )}
      {item.skipped && (
        <Text style={styles.skipped} testID="question-skipped">
          {t('lesson.skipped')}
        </Text>
      )}
      {active && item.optional && skipOpen && (
        <View style={styles.footer}>
          {(['knows_it', 'not_now'] as const).map(reason => (
            <Pressable
              key={reason}
              onPress={() => h.onSkip(reason)}
              style={styles.button}
              accessibilityRole="button"
              testID={`skip-${reason}`}
            >
              <Text style={styles.buttonText}>
                {t(
                  reason === 'knows_it'
                    ? 'lesson.skipKnows'
                    : 'lesson.skipNotNow',
                )}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {active && (
        <View style={styles.footer}>
          {item.optional && !skipOpen && (
            <Pressable
              onPress={() => setSkipOpen(true)}
              style={styles.button}
              accessibilityRole="button"
              testID="skip"
            >
              <Text style={styles.buttonText}>{t('lesson.skip')}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={h.onNotSure}
            style={[styles.button, styles.notSure]}
            accessibilityRole="button"
            testID="not-sure"
          >
            <Text style={styles.notSureText}>{t('lesson.notSure')}</Text>
          </Pressable>
          {item.hintCount > 0 && (
            <Pressable
              onPress={h.onHint}
              disabled={!hintsLeft}
              style={[styles.button, !hintsLeft && styles.disabled]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hintsLeft }}
              testID="hint"
            >
              <LevelLabel
                text={t('lesson.hint')}
                level={item.hintLevel}
                total={Math.min(3, item.hintCount)}
              />
            </Pressable>
          )}
          {!hintsLeft && (
            <Pressable
              onPress={h.onReveal}
              style={styles.button}
              accessibilityRole="button"
              testID="reveal"
            >
              <Text style={styles.buttonText}>{t('lesson.showAnswer')}</Text>
            </Pressable>
          )}
          {canRequest && (
            <>
              <Pressable
                onPress={() => h.onRequest('change_method')}
                style={styles.button}
                accessibilityRole="button"
                testID="request-change-method"
              >
                <Text style={styles.buttonText}>
                  {t('lesson.changeMethod')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => h.onRequest('simpler')}
                style={styles.button}
                accessibilityRole="button"
                testID="request-simpler"
              >
                <Text style={styles.buttonText}>{t('lesson.simpler')}</Text>
              </Pressable>
            </>
          )}
          {item.canGoBack && (
            <Pressable
              onPress={h.onBack}
              style={styles.button}
              accessibilityRole="button"
              testID="back-to-question"
            >
              <Text style={styles.buttonText}>{t('lesson.back')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    padding: theme.space.lg,
    marginVertical: theme.space.xs,
  },
  inactive: { opacity: theme.opacity.inactive },
  footer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginTop: theme.space.md,
  },
  button: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    justifyContent: 'center',
  },
  notSure: { borderStyle: 'dashed', borderColor: theme.color.textSecondary },
  notSureText: {
    fontSize: theme.font.size.body,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
  },
  buttonText: {
    fontSize: theme.font.size.callout,
    color: theme.color.actionPrimary,
    writingDirection: 'rtl',
  },
  disabled: { opacity: theme.opacity.disabled },
  skipped: {
    marginTop: theme.space.sm,
    fontSize: theme.font.size.callout,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
