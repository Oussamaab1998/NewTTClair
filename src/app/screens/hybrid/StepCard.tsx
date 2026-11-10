/**
 * The step he is on, as one card: what now, why, and what comes next (his
 * route, not the authored one), the prompt, the tutor's voice on this step
 * (his acts and the answers, the AI's moves with their pinned component),
 * the readback of an ambiguous division, and the input the frame asks for
 * (plan cards, a word to tap, the line pad, a card to pick, the recipe, a
 * similar question, a repair stage). «ما نعرفش» is always one tap away
 * while help exists for the step. On a small case an AI move put him on,
 * the «الصندوق الصغير» panel: list its groups, write its lines (they go
 * under the case on his page), or come back to the question.
 */
import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { StudentAct } from '../../../ai/checks/autoCheck';
import { ComponentHost } from '../../../components/ComponentHost';
import type { ComponentSpec } from '../../../components/contract';
import type {
  MethodFrameStep,
  RepairStage,
  Rich,
} from '../../../content/schema';
import type { Strip } from '../../../hybrid/board';
import type { FrameView } from '../../../hybrid/conductor/types';
import { StudentBubble, ToneBlock } from '../../../lesson/feed/Bubbles';
import { CardsPick } from '../../../lesson/feed/method/CardsPick';
import { ListBuilder } from '../../../lesson/feed/method/ListBuilder';
import { MethodNoteView } from '../../../lesson/feed/method/MethodNoteView';
import { PlanCards } from '../../../lesson/feed/method/PlanCards';
import { StatementTap } from '../../../lesson/feed/method/StatementTap';
import { RichView } from '../../../lesson/feed/RichView';
import { MathBlock } from '../../../lesson/math/MathBlock';
import type { Experiment } from '../../../engine/calls';
import { checkPlan } from '../../../method/frame';
import { lineLatex } from '../../../method/lineChain';
import type { ReplyPart } from '../../../method/replies';
import { ballsOf } from '../../../method/repair';
import { seededOrder } from '../../../method/shuffle';
import { theme } from '../../../theme';
import { TutorMessage } from '../tutor/TutorMessage';
import { CasePanel } from './CasePanel';
import { LineEntry } from './LineEntry';
import type { Exchange, LiveComponent } from './useHybridSession';
import type { SkillLevel } from '../../../ai/profile/profile';
import type { ConductorState } from '../../../hybrid/conductor/types';

/** Frames where «ما نعرفش» gives a hint (similar questions are without help). */
const HELPED = new Set<FrameView['type']>(['plan', 'read', 'lines', 'cards']);

function PartView({ part }: { part: ReplyPart }) {
  switch (part.kind) {
    case 'note':
      return (
        <ToneBlock tone={part.tone}>
          <MethodNoteView note={part.note} />
        </ToneBlock>
      );
    case 'feedback':
      return <ToneBlock tone={part.tone} rich={part.rich} />;
    case 'message':
      return <ToneBlock tone={part.tone} message={part.message} />;
    case 'student':
      return <StudentBubble content={part.content} />;
  }
}

/** One act of his and the answer: his act at the reading end, the tutor's words, a pinned component. */
export const ExchangeView = memo(function ExchangeViewImpl({
  x,
  live,
  onFinish,
}: {
  x: Exchange;
  /** The callbacks of its component while it is the live one. */
  live: LiveComponent | null;
  onFinish?: (exchangeId: string) => void;
}) {
  const { t } = useTranslation();
  const said = x.said;
  const component = said?.kind === 'blocks' ? said.component : null;
  const isLive = live !== null && component !== null && !component.done;
  return (
    <View style={styles.exchange} testID={`exchange-${x.reason}`}>
      {x.his.map((c, i) => (
        <View key={i} style={styles.his}>
          <StudentBubble content={c} />
        </View>
      ))}
      {x.pending && (
        <Text style={styles.waiting} testID="hybrid-waiting">
          {t('hybrid.step.waiting')}
        </Text>
      )}
      {said?.kind === 'parts' &&
        said.parts.map((p, i) => <PartView key={i} part={p} />)}
      {said?.kind === 'blocks' && (
        <>
          <TutorMessage
            id={x.id}
            blocks={said.blocks}
            component={said.component}
            live={isLive ? live : null}
          />
          {said.ai && (
            <Text style={styles.aiMark} testID="hybrid-ai-mark">
              {t('hybrid.step.aiMark')}
            </Text>
          )}
        </>
      )}
      {isLive && onFinish && (
        <Pressable
          style={styles.primary}
          accessibilityRole="button"
          testID="hybrid-component-done"
          onPress={() => onFinish(x.id)}
        >
          <Text style={styles.primaryText}>{t('hybrid.step.finished')}</Text>
        </Pressable>
      )}
    </View>
  );
});

function Label({ label, rich }: { label: string; rich: Rich | null }) {
  if (!rich) {
    return null;
  }
  return (
    <View style={styles.headerLine}>
      <Text style={styles.headerLabel}>{label}</Text>
      <View style={styles.headerText}>
        <RichView rich={rich} fontSize={theme.font.size.small} />
      </View>
    </View>
  );
}

export interface StepCardProps {
  frame: FrameView;
  step: MethodFrameStep;
  /** The repair stage he is at. */
  stage: number;
  /** His lines on a similar question so far (reviewed when he says he is done). */
  similarLines: readonly string[];
  next: Strip['next'];
  exchanges: readonly Exchange[];
  readback: { literal: string; grouped: string } | null;
  waiting: boolean;
  experiment: Experiment | undefined;
  live: LiveComponent;
  onAct: (a: StudentAct) => void;
  onReadback: (choice: 'grouped' | 'literal') => void;
  onFinishMove: (exchangeId: string) => void;
  onFinishPicture: (spec: ComponentSpec) => void;
  /** The conductor state (the worksheet reads his lines and the tiles from it). */
  state: ConductorState;
  /** His level on a node's skill (the worksheet's scaffold fading). */
  levelOf: (node: string | null) => SkillLevel;
}

export function StepCard(p: StepCardProps) {
  const { t } = useTranslation();
  const { frame } = p;
  const similar = frame.type === 'similar';
  const caseId = p.state.onCase;
  const caseSpec = caseId ? p.state.session.cases[caseId] : undefined;
  const nextLabel = p.next?.kind === 'similar' ? null : p.next?.short ?? null;
  // The newest exchange's component is live while it is not finished.
  const lastId = p.exchanges[p.exchanges.length - 1]?.id;
  return (
    <View style={styles.card} testID="step-card">
      <View style={styles.header} testID="step-header">
        {similar ? (
          <Text style={styles.similar}>{t('hybrid.step.similar')}</Text>
        ) : (
          <>
            <Label
              label={t('hybrid.step.now')}
              rich={frame.header?.now ?? null}
            />
            <Label
              label={t('hybrid.step.why')}
              rich={frame.header?.why ?? null}
            />
          </>
        )}
        {p.next?.kind === 'similar' ? (
          <View style={styles.headerLine}>
            <Text style={styles.headerLabel}>{t('hybrid.step.next')}</Text>
            <Text style={styles.headerPlain}>{t('hybrid.strip.similar')}</Text>
          </View>
        ) : (
          <Label label={t('hybrid.step.next')} rich={nextLabel} />
        )}
      </View>
      {frame.prompt && (
        <RichView
          rich={frame.prompt}
          fontFamily={theme.font.family.ui.bold}
          {...(frame.prompt.ar === undefined && { variant: 'paper' as const })}
        />
      )}
      {p.exchanges.map(x => (
        <ExchangeView
          key={x.id}
          x={x}
          live={x.id === lastId ? p.live : null}
          onFinish={p.onFinishMove}
        />
      ))}
      {p.readback && (
        <View style={styles.readback} testID="hybrid-readback">
          <Text style={styles.readbackAsk}>{t('method.readback.ask')}</Text>
          {(['grouped', 'literal'] as const).map(c => (
            <Pressable
              key={c}
              style={styles.choice}
              accessibilityRole="button"
              testID={`hybrid-readback-${c}`}
              onPress={() => p.onReadback(c)}
            >
              <Text style={styles.choiceLabel}>
                {t(`method.readback.${c}`)}
              </Text>
              <MathBlock
                latex={lineLatex(
                  c === 'grouped' ? p.readback!.grouped : p.readback!.literal,
                )}
                fontSize={theme.font.size.body}
              />
            </Pressable>
          ))}
        </View>
      )}
      {caseId && caseSpec && (
        <CasePanel
          caseId={caseId}
          spec={caseSpec}
          lines={frame.type === 'lines'}
          disabled={p.waiting}
          onAct={p.onAct}
        />
      )}
      <View
        style={styles.input}
        pointerEvents={p.waiting ? 'none' : 'auto'}
        testID="step-input"
      >
        <FrameInput key={`${frame.frameId}.${p.stage}`} {...p} />
      </View>
      {HELPED.has(frame.type) && (
        <Pressable
          style={styles.chip}
          accessibilityRole="button"
          testID="hybrid-dont-know"
          disabled={p.waiting}
          onPress={() => p.onAct({ kind: 'dont_know' })}
        >
          <Text style={styles.chipText}>{t('hybrid.step.dontKnow')}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** What the frame asks him to do. */
function FrameInput(p: StepCardProps) {
  const { t } = useTranslation();
  const { step } = p;
  const f = step.frame;
  const pool = useMemo(() => {
    if (f.type === 'plan') {
      const byId = new Map(f.cards.map(c => [c.id, c]));
      return seededOrder(
        f.cards.map(c => c.id),
        step.id,
        o => checkPlan(f.cards, o).ok,
      ).map(id => ({ id, text: byId.get(id)!.text }));
    }
    if (f.type === 'recipe') {
      const byId = new Map(f.pool.map(c => [c.id, c]));
      return seededOrder(
        f.pool.map(c => c.id),
        step.id,
      ).map(id => ({ id, text: byId.get(id)!.text }));
    }
    return [];
  }, [f, step.id]);
  const line = (raw: string) => p.onAct({ kind: 'line', raw });
  // On a small case his lines go under the case on his page, not under the step.
  const onCase = p.state.onCase !== null;
  const caseTitle = t('hybrid.case.title');
  const label = useMemo(
    () =>
      onCase ? { ar: [{ ar: caseTitle }] } : step.short ?? { ar: [{ ar: '' }] },
    [onCase, caseTitle, step.short],
  );
  const sheet = (node: string | null, key: string | null) => ({
    step: { id: onCase ? `${step.id}#case` : step.id, label, node, key },
    state: p.state,
    level: p.levelOf(node),
  });

  switch (f.type) {
    case 'plan':
      return (
        <PlanCards
          pool={pool}
          readonly={false}
          onSubmit={ids => p.onAct({ kind: 'order', ids })}
        />
      );
    case 'recipe':
      return (
        <PlanCards
          pool={pool}
          readonly={false}
          min={3}
          max={5}
          labels={{
            slot: 'method.recipe.slot',
            pool: 'method.recipe.pool',
            confirm: 'method.recipe.confirm',
          }}
          onSubmit={ids => p.onAct({ kind: 'order', ids })}
          testID="recipe-cards"
        />
      );
    case 'read':
      return (
        <StatementTap
          sentence={f.sentence}
          readonly={false}
          onTap={token => p.onAct({ kind: 'tap_word', token })}
        />
      );
    case 'cards':
      return (
        <CardsPick
          cards={f.cards}
          seed={step.id}
          readonly={false}
          onPick={optionId => p.onAct({ kind: 'choice', optionId })}
        />
      );
    case 'lines':
      return <LineEntry active onLine={line} {...sheet(f.key, f.key)} />;
    case 'similar':
      return (
        <View style={styles.input}>
          <LineEntry active onLine={line} {...sheet(null, null)} />
          <Pressable
            onPress={() => p.onAct({ kind: 'continue' })}
            disabled={p.similarLines.length === 0}
            style={[
              styles.primary,
              p.similarLines.length === 0 && styles.primaryOff,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: p.similarLines.length === 0 }}
            testID="similar-done"
          >
            <Text style={styles.primaryText}>{t('method.similar.done')}</Text>
          </Pressable>
        </View>
      );
    case 'repair': {
      const st = f.stages[p.stage];
      return st ? (
        <RepairInput st={st} seed={`${step.id}.${p.stage}`} {...p} />
      ) : null;
    }
  }
}

/** One stage of a repair script: read and acknowledge, list, write, pick, or look at a picture. */
function RepairInput({
  st,
  seed,
  ...p
}: StepCardProps & { st: RepairStage; seed: string }) {
  const { t } = useTranslation();
  const ok = (onPress: () => void, testID: string) => (
    <Pressable
      onPress={onPress}
      style={styles.primary}
      accessibilityRole="button"
      testID={testID}
    >
      <Text style={styles.primaryText}>{t('method.show.ok')}</Text>
    </Pressable>
  );
  switch (st.type) {
    case 'show':
      return (
        <View style={styles.input}>
          <RichView rich={st.text} />
          {ok(() => p.onAct({ kind: 'continue' }), 'repair-ack')}
        </View>
      );
    case 'list':
      return (
        <View style={styles.input}>
          <RichView rich={st.prompt} fontFamily={theme.font.family.ui.bold} />
          <ListBuilder
            balls={ballsOf(st.reds, st.blacks)}
            size={st.k}
            readonly={false}
            onSubmit={groups => p.onAct({ kind: 'list', groups })}
          />
        </View>
      );
    case 'line':
      return (
        <View style={styles.input}>
          <RichView rich={st.prompt} fontFamily={theme.font.family.ui.bold} />
          <LineEntry
            active
            onLine={raw => p.onAct({ kind: 'line', raw })}
            step={{
              id: p.step.id,
              label: p.step.short ?? { ar: [{ ar: '' }] },
              node: st.node,
              key: null,
            }}
            state={p.state}
            level={p.levelOf(st.node)}
          />
        </View>
      );
    case 'cards':
      return (
        <View style={styles.input}>
          <RichView rich={st.prompt} fontFamily={theme.font.family.ui.bold} />
          <CardsPick
            cards={st.cards}
            seed={seed}
            readonly={false}
            onPick={optionId => p.onAct({ kind: 'choice', optionId })}
          />
        </View>
      );
    case 'component':
      return (
        <View style={styles.input}>
          {st.prompt && (
            <RichView rich={st.prompt} fontFamily={theme.font.family.ui.bold} />
          )}
          <ComponentHost
            spec={st.component}
            defaultInstanceId={seed}
            mode="interactive"
            {...(p.experiment && { experiment: p.experiment })}
            onEvent={p.live.onEvent}
            onResult={p.live.onResult}
            handleRef={p.live.handle}
            onError={() => {}}
          />
          {ok(() => p.onFinishPicture(st.component), 'repair-looked')}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.color.card,
    borderColor: theme.color.ink,
    borderWidth: theme.border.active,
    borderRadius: theme.radius.card,
    padding: theme.space.xxl,
    gap: theme.space.md,
  },
  header: {
    gap: theme.space.xxs,
    paddingBottom: theme.space.sm,
    borderBottomWidth: theme.border.line,
    borderBottomColor: theme.color.gridLine,
  },
  headerLine: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
  },
  headerLabel: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
  },
  headerText: { flex: 1 },
  headerPlain: {
    ...theme.font.small,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
  },
  similar: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  exchange: { gap: theme.space.sm },
  his: { alignItems: theme.reading.endAlign },
  waiting: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  aiMark: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  readback: {
    gap: theme.space.xs,
    padding: theme.space.sm,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.pen,
    backgroundColor: theme.color.highlighterSoft,
  },
  readbackAsk: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  choice: {
    minHeight: theme.size.touch,
    padding: theme.space.sm,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    gap: theme.space.xs,
  },
  choiceLabel: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  input: { gap: theme.space.sm },
  chip: {
    alignSelf: theme.reading.startAlign,
    minHeight: theme.size.touch,
    justifyContent: 'center',
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceKey,
  },
  chipText: {
    ...theme.font.body,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
  },
  primary: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryOff: { backgroundColor: theme.color.inkDisabled },
  primaryText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
  },
});
