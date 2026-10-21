import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { keypadFor, linesSpecOf, stepKey } from '../../content/loader';
import type { JsonObject } from '../../components/contract';
import { LinesCard, LinesSnapshotSchema } from '../lines/LinesCard';
import { HelpContext } from './help';
import type { Experiment } from '../../engine/calls';
import type { FrameStep } from '../session/lesson';
import type { FeedItemOf, RequestKind, SkipReason } from '../session/types';
import { CardMemoryContext } from './cardMemory';
import { SnapshotContext } from './snapshots';
import { LevelLabel } from './Bubbles';
import { NumericKeypad } from './NumericKeypad';
import { OptionsQuestion } from './OptionsQuestion';
import { RichView } from './RichView';
import type { CardMenu } from './ReportSheet';
import type { ReportTarget } from './reportTarget';
import { useOverflowCheck } from './layoutCheck';
import { theme } from '../../theme';

const MENU_MARK = '⋯';

export interface QuestionHandlers {
  onSelect: (optionId: string) => void;
  onSubmitTyped: (raw: string, keys: string[]) => void;
  /** Lines steps: one checked line (the reducer re-checks and logs it). */
  onSubmitLine: (line: string, keys: string[]) => void;
  /** Lines steps: an editor input logged on its own (a copied line). */
  onLinesInput: (stepId: string, name: string, payload: JsonObject) => void;
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
  /** The card's "⋯": its actions, trust label and Report (DESIGN.md §3). */
  onCardMenu: (target: ReportTarget, card: CardMenu) => void;
  /** Report one block directly (the visuals' rows in the card's "⋯"). */
  onReport: (target: ReportTarget) => void;
}

interface QuestionCardProps extends QuestionHandlers {
  item: FeedItemOf<'question'>;
  step: FrameStep;
  experiment?: Experiment;
  /** Report target of this card (null: no menu). */
  reportTarget: ReportTarget | null;
  /** Interactive visuals reported from this card's "⋯" (no long-press on them). */
  visualTargets: readonly ReportTarget[];
}

/**
 * The active question (always last in the feed), or a readonly copy once it is
 * done or paused by a deep dive. Footer: dashed "ما نعرفش", the hint ladder
 * (n/3), the answer only at the end of the ladder, skip on optional steps, and
 * one quiet "⋯": "change method", "something easier" (only when authored),
 * "back" inside deep dives, the trust label and Report. A done card keeps a
 * small "⋯" for its trust label and Report.
 */
export const QuestionCard = memo(function QuestionCardImpl({
  item,
  step,
  experiment,
  reportTarget,
  visualTargets,
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
  const help = useContext(HelpContext);
  const canRequest = item.ref.scope !== 'mini';
  const canChange = canRequest && help?.changeMethod === true;
  const canSimpler = canRequest && help?.simpler === true;
  const handle = useRef<ComponentHandle>(null);
  const [restored] = useState(() =>
    active ? memory?.restore(memoryKey, item.key) : undefined,
  );
  useEffect(() => {
    memory?.register(memoryKey, item.key, handle);
    return () => memory?.unregister(memoryKey, item.key);
  }, [memory, memoryKey, item.key]);
  // Ask / long-press / report attach this card's state (snapshots.ts).
  const snapshots = useContext(SnapshotContext);
  const snapshotName =
    step.kind === 'component' ? step.component.component : step.kind;
  useEffect(() => {
    snapshots?.register(item.key, snapshotName, handle);
    return () => snapshots?.unregister(item.key, handle);
  }, [snapshots, item.key, snapshotName]);
  const [skipOpen, setSkipOpen] = useState(false);
  const restoredRaw =
    typeof restored?.raw === 'string' ? restored.raw : undefined;

  const menuButton = useRef<React.ComponentRef<typeof View>>(null);
  // Debug builds: no footer button may stick out of the card (layoutCheck.ts).
  const fit = useOverflowCheck('question-footer');
  const openMenu = () => {
    if (!reportTarget) {
      return;
    }
    const actions = active
      ? [
          ...(canChange
            ? [
                {
                  label: t('lesson.changeMethod'),
                  testID: 'request-change-method',
                  onPress: () => h.onRequest('change_method'),
                },
              ]
            : []),
          ...(canSimpler
            ? [
                {
                  label: t('lesson.simpler'),
                  testID: 'request-simpler',
                  onPress: () => h.onRequest('simpler'),
                },
              ]
            : []),
          ...(item.canGoBack
            ? [
                {
                  label: t('lesson.back'),
                  testID: 'back-to-question',
                  onPress: h.onBack,
                },
              ]
            : []),
        ]
      : [];
    const visualRows = visualTargets.map(v => ({
      label: t('lesson.report.visual'),
      testID: `card-report-visual-${v.itemKey}`,
      onPress: () => h.onReport(v),
    }));
    h.onCardMenu(reportTarget, {
      stepKey: memoryKey,
      actions: [...actions, ...visualRows],
      focusBack: () => {
        if (menuButton.current) {
          AccessibilityInfo.sendAccessibilityEvent(menuButton.current, 'focus');
        }
      },
    });
  };
  const menu = reportTarget && (
    <Pressable
      ref={menuButton}
      onPress={openMenu}
      style={active ? [styles.button, styles.menu] : styles.cornerMenu}
      hitSlop={active ? undefined : theme.size.blockMenuSlop}
      {...(active && fit && { onLayout: fit.onChild('menu') })}
      accessibilityRole="button"
      accessibilityLabel={t('lesson.report.menu')}
      testID={`card-menu-${item.key}`}
    >
      <Text style={styles.menuMark}>{MENU_MARK}</Text>
    </Pressable>
  );

  return (
    <View
      style={[styles.card, active && styles.active, !active && styles.inactive]}
      testID={testID}
      accessibilityState={{ disabled: !active }}
    >
      {active && (
        <Text style={styles.tab} testID="question-tab">
          {t('lesson.questionTab')}
        </Text>
      )}
      {!active && menu}
      {step.prompt && (
        <RichView rich={step.prompt} fontFamily={theme.font.family.ui.bold} />
      )}
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
      ) : step.kind === 'lines' ? (
        <LinesCard
          spec={linesSpecOf(step)}
          {...(step.lhs !== undefined && { lhs: step.lhs })}
          {...(step.goalLatex !== undefined && { goalLatex: step.goalLatex })}
          {...(step.keys && { keys: step.keys })}
          readonly={!active}
          initial={linesInitial(restored, item.lines, item.status === 'done')}
          onLine={(line, keys) => h.onSubmitLine(line, keys)}
          onInput={(name, payload) => h.onLinesInput(step.id, name, payload)}
          testID={`lines-${item.status}`}
          ref={handle}
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
        <View
          style={styles.footer}
          {...(fit && { onLayout: fit.onRow })}
          testID="question-footer"
        >
          {item.optional && !skipOpen && (
            <Pressable
              onPress={() => setSkipOpen(true)}
              {...(fit && { onLayout: fit.onChild('skip') })}
              style={styles.button}
              accessibilityRole="button"
              testID="skip"
            >
              <Text style={styles.buttonText}>{t('lesson.skip')}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={h.onNotSure}
            {...(fit && { onLayout: fit.onChild('not-sure') })}
            style={[styles.button, styles.notSure]}
            accessibilityRole="button"
            testID="not-sure"
          >
            <Text style={styles.notSureText}>{t('lesson.notSure')}</Text>
          </Pressable>
          {item.hintCount > 0 && (
            <Pressable
              onPress={h.onHint}
              {...(fit && { onLayout: fit.onChild('hint') })}
              disabled={!hintsLeft}
              style={[styles.button, !hintsLeft && styles.buttonDisabled]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hintsLeft }}
              testID="hint"
            >
              <LevelLabel
                text={t('lesson.hint')}
                level={item.hintLevel}
                total={Math.min(3, item.hintCount)}
                muted={!hintsLeft}
              />
            </Pressable>
          )}
          {!hintsLeft && (
            <Pressable
              onPress={h.onReveal}
              {...(fit && { onLayout: fit.onChild('reveal') })}
              style={styles.button}
              accessibilityRole="button"
              testID="reveal"
            >
              <Text style={styles.buttonText}>{t('lesson.showAnswer')}</Text>
            </Pressable>
          )}
          {menu}
        </View>
      )}
    </View>
  );
});

/** A lines card restored after a deep dive, or rebuilt from the reducer's lines. */
function linesInitial(
  restored: unknown,
  lines: string[] | undefined,
  done: boolean,
) {
  const r = LinesSnapshotSchema.safeParse(restored);
  if (r.success) {
    return r.data;
  }
  return {
    accepted: lines ?? [],
    editor: { root: [], cursor: { path: [], at: 0 } },
    collapsed: false,
    last: null,
    done,
  };
}

const styles = StyleSheet.create({
  // Cahier question card (DESIGN.md §3): white, 2 pt pen border and an
  // «السؤال» tab while active; done or paused copies are quiet.
  card: {
    backgroundColor: theme.color.card,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    padding: theme.space.lg,
    marginVertical: theme.space.xs,
  },
  active: {
    borderWidth: theme.border.active,
    borderColor: theme.color.pen,
    marginTop: theme.space.lg,
  },
  inactive: { opacity: theme.opacity.inactive },
  tab: {
    position: 'absolute',
    top: theme.offset.cardTab,
    ...theme.reading.startEdge(theme.space.lg),
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    backgroundColor: theme.color.pen,
    borderRadius: theme.radius.tag,
    overflow: 'hidden',
    paddingHorizontal: theme.space.md,
    writingDirection: 'rtl',
  },
  footer: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginTop: theme.space.md,
  },
  button: {
    minHeight: theme.size.touch,
    minWidth: theme.size.touch,
    paddingHorizontal: theme.space.xl,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The quiet "⋯" follows «ما نعرفش» and the hint, same gap (one group at the start).
  menu: { paddingHorizontal: theme.space.md },
  cornerMenu: {
    position: 'absolute',
    top: theme.space.xxs,
    ...theme.reading.endEdge(theme.space.sm),
    zIndex: 1,
  },
  menuMark: { ...theme.font.body, color: theme.color.inkMuted },
  notSure: { borderStyle: 'dashed', borderColor: theme.color.ink },
  notSureText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  buttonText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.medium,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
  // Solid colours, not opacity: the label stays readable (4.59:1).
  buttonDisabled: { borderColor: theme.color.border },
  skipped: {
    marginTop: theme.space.sm,
    ...theme.font.small,
    color: theme.color.inkMuted,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
