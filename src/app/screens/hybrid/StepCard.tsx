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
 *
 * One place to act at a time: on a small box the case card is the only
 * input (the paper folds to one line, «ما نعرفش» hides, the AI's component
 * is a picture); on any case the component has no «كمّلت». Older answers
 * fold to their first line (his own acts stay as chips); the newest stays
 * open. While an answer is on its way, a typing bubble stands where it will
 * land and every action is off and dimmed; the one he pressed spins.
 */
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

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
import {
  MethodNoteView,
  noteSpoken,
} from '../../../lesson/feed/method/MethodNoteView';
import { PlanCards } from '../../../lesson/feed/method/PlanCards';
import { StatementTap } from '../../../lesson/feed/method/StatementTap';
import { RichView } from '../../../lesson/feed/RichView';
import { MathBlock } from '../../../lesson/math/MathBlock';
import { isolateInline } from '../../../lesson/rich/runs';
import type { StudentContent } from '../../../lesson/session/types';
import type { Experiment } from '../../../engine/calls';
import { checkPlan } from '../../../method/frame';
import { lineLatex } from '../../../method/lineChain';
import type { ReplyPart } from '../../../method/replies';
import { ballsOf } from '../../../method/repair';
import { seededOrder } from '../../../method/shuffle';
import { theme } from '../../../theme';
import { TutorMessage } from '../tutor/TutorMessage';
import { CasePanel, type CaseBusy } from './CasePanel';
import { LineEntry } from './LineEntry';
import { TypingBubble } from './TypingBubble';
import type { Exchange, LiveComponent, Said } from './useHybridSession';
import type { SkillLevel } from '../../../ai/profile/profile';
import type { ConductorState } from '../../../hybrid/conductor/types';

/** Frames where «ما نعرفش» gives a hint (similar questions are without help). */
const HELPED = new Set<FrameView['type']>(['plan', 'read', 'lines', 'cards']);
/** A folded answer (pointing toward the reading direction), and an open one. */
const FOLDED_MARK = '◂';
const OPEN_MARK = '▾';

/** The control whose act is being answered (it spins while he waits). */
type Pressed =
  | 'dont_know'
  | 'finish'
  | 'line'
  | 'case_list'
  | 'case_back'
  | 'other';

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

/** His act: a tap («ما نعرفش») as a small chip, his words and lines as a bubble. */
function HisAct({ content }: { content: StudentContent }) {
  const { t } = useTranslation();
  if (content.kind === 'message') {
    return (
      <View style={styles.hisChip} testID="his-chip">
        <Text style={styles.hisChipText}>{t(`lesson.${content.message}`)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.his}>
      <StudentBubble content={content} />
    </View>
  );
}

type Tone = 'success' | 'warning' | 'info';
type Preview =
  | { kind: 'rich'; rich: Rich; tone: Tone | null }
  | { kind: 'text'; text: string; tone: Tone | null }
  | { kind: 'reply' };

/** The first line of an answer: its Arabic words (or its French line), never a formula alone. */
function previewOf(said: Said, t: TFunction): Preview {
  const lead = (rich: Rich, tone: Tone | null): Preview =>
    rich.ar
      ? { kind: 'rich', rich: { ar: rich.ar }, tone }
      : rich.fr !== undefined
      ? { kind: 'rich', rich: { fr: rich.fr }, tone }
      : { kind: 'reply' };
  if (said.kind === 'parts') {
    const part = said.parts.find(x => x.kind !== 'student');
    switch (part?.kind) {
      case 'feedback':
        return lead(part.rich, part.tone);
      case 'message':
        return {
          kind: 'text',
          text: t(`lesson.${part.message}`),
          tone: part.tone,
        };
      case 'note':
        return {
          kind: 'text',
          text: isolateInline(noteSpoken(t, part.note)),
          tone: part.tone,
        };
      default:
        return { kind: 'reply' };
    }
  }
  const block = said.blocks[0];
  return block?.type === 'ar'
    ? { kind: 'rich', rich: { ar: block.runs }, tone: null }
    : block?.type === 'fr'
    ? { kind: 'rich', rich: { fr: block.text }, tone: null }
    : { kind: 'reply' };
}

/** A folded answer on one line: its tone's mark (not colour alone) and its first words. */
function ReplyPreview({ said }: { said: Said }) {
  const { t } = useTranslation();
  const v = previewOf(said, t);
  const tone = v.kind === 'reply' ? null : v.tone;
  return (
    <View style={styles.preview}>
      {tone && (
        <Text style={styles.previewMark}>{theme.feedback[tone].icon}</Text>
      )}
      <View style={styles.previewText}>
        {v.kind === 'rich' ? (
          <RichView
            rich={v.rich}
            fontSize={theme.font.size.small}
            color={theme.color.textSecondary}
            numberOfLines={1}
            mathScroll={false}
          />
        ) : (
          <Text style={styles.previewPlain} numberOfLines={1}>
            {v.kind === 'text' ? v.text : t('hybrid.step.reply')}
          </Text>
        )}
      </View>
    </View>
  );
}

/** One act of his and the answer: his act at the reading end, the tutor's words, a pinned component. */
export const ExchangeView = memo(function ExchangeViewImpl({
  x,
  live,
  onFinish,
  waiting = false,
  finishing = false,
  folded,
  onToggle,
  onLayout,
}: {
  x: Exchange;
  /** The callbacks of its component while it is the live one (null: a picture). */
  live: LiveComponent | null;
  onFinish?: (exchangeId: string) => void;
  /** An answer is on its way: «كمّلت» is off. */
  waiting?: boolean;
  /** «كمّلت» is the act being answered: it spins. */
  finishing?: boolean;
  /** An older exchange on the card: folded to one line (true) or opened (false). */
  folded?: boolean;
  onToggle?: (exchangeId: string) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const { t } = useTranslation();
  const said = x.said;
  const component = said?.kind === 'blocks' ? said.component : null;
  const isLive = live !== null && component !== null && !component.done;
  const foldable = folded !== undefined && said !== null && !!onToggle;
  const shut = foldable && folded === true;
  return (
    <View
      style={styles.exchange}
      testID={`exchange-${x.reason}`}
      {...(onLayout && { onLayout })}
    >
      {x.his.map((c, i) => (
        <HisAct key={i} content={c} />
      ))}
      {x.pending && <TypingBubble />}
      {foldable && onToggle && said && (
        <Pressable
          style={styles.fold}
          accessibilityRole="button"
          accessibilityLabel={t(
            shut ? 'hybrid.step.openReply' : 'hybrid.step.foldReply',
          )}
          accessibilityState={{ expanded: !shut }}
          testID="reply-fold"
          onPress={() => onToggle(x.id)}
        >
          <Text style={styles.foldMark}>{shut ? FOLDED_MARK : OPEN_MARK}</Text>
          {shut && <ReplyPreview said={said} />}
        </Pressable>
      )}
      {!shut &&
        said?.kind === 'parts' &&
        said.parts.map((p, i) => <PartView key={i} part={p} />)}
      {!shut && said?.kind === 'blocks' && (
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
          style={[styles.primary, waiting && !finishing && styles.primaryOff]}
          accessibilityRole="button"
          accessibilityState={{ disabled: waiting, busy: finishing }}
          disabled={waiting}
          testID="hybrid-component-done"
          onPress={() => onFinish(x.id)}
        >
          <View style={styles.busyRow}>
            {finishing && (
              <ActivityIndicator
                size="small"
                color={theme.color.textOnAccent}
                testID="hybrid-component-done-busy"
              />
            )}
            <Text style={styles.primaryText}>{t('hybrid.step.finished')}</Text>
          </View>
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
  /**
   * Bring something that just appeared into view: `at` gives its top,
   * relative to the card, once it is laid out (undefined: not measured).
   */
  onReveal?: (at: () => number | undefined) => void;
  /** The card's own place (the screen adds it to `onReveal`'s tops). */
  onLayout?: (e: LayoutChangeEvent) => void;
}

/** What the input inside the card needs besides the card's props. */
type InputProps = StepCardProps & {
  /** His line is the act being answered: «نثبّت» spins. */
  lineBusy: boolean;
};

const NO_IDS: ReadonlySet<string> = new Set();

export function StepCard(p: StepCardProps) {
  const { t } = useTranslation();
  const { frame, onAct, onFinishMove, onReveal } = p;
  const similar = frame.type === 'similar';
  const caseId = p.state.onCase;
  const caseSpec = caseId ? p.state.session.cases[caseId] : undefined;
  const onCase = caseId !== null && caseSpec !== undefined;
  // A small box: its card is the only place to act.
  const box = caseSpec?.kind === 'box';
  const nextLabel = p.next?.kind === 'similar' ? null : p.next?.short ?? null;
  // The newest exchange's component is live while it is not finished.
  const lastId = p.exchanges[p.exchanges.length - 1]?.id;

  // The control he pressed: read while the answer is on its way, forgotten
  // once nothing waits (an instant answer, or the end of the wait).
  const pressed = useRef<Pressed | null>(null);
  useEffect(() => {
    if (!p.waiting) {
      pressed.current = null;
    }
  });
  const busy = (k: Pressed) => p.waiting && pressed.current === k;
  const act = useCallback(
    (k: Pressed, a: StudentAct) => {
      pressed.current = k;
      onAct(a);
    },
    [onAct],
  );
  const finish = useCallback(
    (id: string) => {
      pressed.current = 'finish';
      onFinishMove(id);
    },
    [onFinishMove],
  );
  const caseAct = useCallback(
    (a: StudentAct) => act(a.kind === 'list' ? 'case_list' : 'case_back', a),
    [act],
  );
  const inputAct = useCallback(
    (a: StudentAct) => act(a.kind === 'line' ? 'line' : 'other', a),
    [act],
  );
  const caseBusy: CaseBusy = busy('case_list')
    ? 'list'
    : busy('case_back')
    ? 'back'
    : null;

  // Older answers fold when a new one arrives; he can open one again.
  const [opened, setOpened] = useState<{
    last: string | undefined;
    ids: ReadonlySet<string>;
  }>({ last: undefined, ids: NO_IDS });
  const openIds = opened.last === lastId ? opened.ids : NO_IDS;
  const toggle = useCallback(
    (id: string) =>
      setOpened(o => {
        const ids = new Set(o.last === lastId ? o.ids : NO_IDS);
        if (!ids.delete(id)) {
          ids.add(id);
        }
        return { last: lastId, ids };
      }),
    [lastId],
  );

  // Where the screen goes (B11): the top of a new exchange (the typing
  // bubble's too), else the case card when it opens, else the paper when
  // it is the input again; a new step shows its card. Tops are measured
  // here, relative to the card.
  const tops = useRef(new Map<string, number>());
  const layouts = useRef(new Map<string, (e: LayoutChangeEvent) => void>());
  const layoutOf = (key: string) => {
    let f = layouts.current.get(key);
    if (!f) {
      f = e => {
        tops.current.set(key, e.nativeEvent.layout.y);
      };
      layouts.current.set(key, f);
    }
    return f;
  };
  const seen = useRef<{
    frameId: string | null;
    ids: Set<string>;
    caseId: string | null;
  }>({ frameId: null, ids: new Set(), caseId: null });
  useEffect(() => {
    const s = seen.current;
    const newStep = s.frameId !== frame.frameId;
    if (newStep) {
      s.frameId = frame.frameId;
      s.ids = new Set();
    }
    const fresh = p.exchanges.find(x => !s.ids.has(x.id));
    p.exchanges.forEach(x => s.ids.add(x.id));
    const opens = caseId !== null && caseId !== s.caseId;
    const closes = caseId === null && s.caseId !== null;
    s.caseId = caseId;
    const key = fresh
      ? `x:${fresh.id}`
      : opens
      ? 'case'
      : closes
      ? 'paper'
      : newStep
      ? 'card'
      : null;
    if (key && onReveal) {
      onReveal(() => (key === 'card' ? 0 : tops.current.get(key)));
    }
  }, [p.exchanges, caseId, frame.frameId, onReveal]);

  return (
    <View
      style={styles.card}
      testID="step-card"
      {...(p.onLayout && { onLayout: p.onLayout })}
    >
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
      {p.exchanges.map(x => {
        const last = x.id === lastId;
        const c = x.said?.kind === 'blocks' ? x.said.component : null;
        // On a case its card is where he acts: the component is a picture,
        // and a case's component stays one once he left the case.
        const live = last && !onCase && (c === null || c.view.caseId === null);
        return (
          <ExchangeView
            key={x.id}
            x={x}
            live={live ? p.live : null}
            onFinish={finish}
            waiting={p.waiting}
            finishing={last && busy('finish')}
            {...(!last && { folded: !openIds.has(x.id), onToggle: toggle })}
            onLayout={layoutOf(`x:${x.id}`)}
          />
        );
      })}
      {p.readback && (
        <View style={styles.readback} testID="hybrid-readback">
          <Text style={styles.readbackAsk}>{t('method.readback.ask')}</Text>
          {(['grouped', 'literal'] as const).map(c => (
            <Pressable
              key={c}
              style={[styles.choice, p.waiting && styles.off]}
              accessibilityRole="button"
              accessibilityState={{ disabled: p.waiting }}
              disabled={p.waiting}
              testID={`hybrid-readback-${c}`}
              onPress={() => {
                pressed.current = 'other';
                p.onReadback(c);
              }}
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
        <View onLayout={layoutOf('case')}>
          <CasePanel
            caseId={caseId}
            spec={caseSpec}
            lines={frame.type === 'lines' && !box}
            disabled={p.waiting}
            busy={caseBusy}
            onAct={caseAct}
          />
        </View>
      )}
      {box && (
        <View style={styles.paperFolded} testID="paper-folded">
          <Text style={styles.paperFoldedText} numberOfLines={1}>
            {t('hybrid.step.paperFolded')}
          </Text>
        </View>
      )}
      {/* Folded, the paper stays mounted (his page and his draft are kept). */}
      <View
        style={[styles.input, box && styles.hidden]}
        pointerEvents={p.waiting || box ? 'none' : 'auto'}
        onLayout={layoutOf('paper')}
        testID="step-input"
      >
        <FrameInput
          key={`${frame.frameId}.${p.stage}`}
          {...p}
          onAct={inputAct}
          lineBusy={busy('line')}
        />
      </View>
      {HELPED.has(frame.type) && !box && (
        <Pressable
          style={[styles.chip, p.waiting && !busy('dont_know') && styles.off]}
          accessibilityRole="button"
          accessibilityState={{
            disabled: p.waiting,
            busy: busy('dont_know'),
          }}
          testID="hybrid-dont-know"
          disabled={p.waiting}
          onPress={() => act('dont_know', { kind: 'dont_know' })}
        >
          <View style={styles.busyRow}>
            {busy('dont_know') && (
              <ActivityIndicator
                size="small"
                color={theme.color.ink}
                testID="hybrid-dont-know-busy"
              />
            )}
            <Text style={styles.chipText}>{t('hybrid.step.dontKnow')}</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/** What the frame asks him to do. */
function FrameInput(p: InputProps) {
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
    disabled: p.waiting,
    busy: p.lineBusy,
  });
  // The inputs that are not the worksheet are dimmed as one (the worksheet dims its own controls).
  const dim = p.waiting && styles.off;

  switch (f.type) {
    case 'plan':
      return (
        <View style={dim}>
          <PlanCards
            pool={pool}
            readonly={false}
            onSubmit={ids => p.onAct({ kind: 'order', ids })}
          />
        </View>
      );
    case 'recipe':
      return (
        <View style={dim}>
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
        </View>
      );
    case 'read':
      return (
        <View style={dim}>
          <StatementTap
            sentence={f.sentence}
            readonly={false}
            onTap={token => p.onAct({ kind: 'tap_word', token })}
          />
        </View>
      );
    case 'cards':
      return (
        <View style={dim}>
          <CardsPick
            cards={f.cards}
            seed={step.id}
            readonly={false}
            onPick={optionId => p.onAct({ kind: 'choice', optionId })}
          />
        </View>
      );
    case 'lines':
      return <LineEntry active onLine={line} {...sheet(f.key, f.key)} />;
    case 'similar': {
      const off = p.similarLines.length === 0 || p.waiting;
      return (
        <View style={styles.input}>
          <LineEntry active onLine={line} {...sheet(null, null)} />
          <Pressable
            onPress={() => p.onAct({ kind: 'continue' })}
            disabled={off}
            style={[styles.primary, off && styles.primaryOff]}
            accessibilityRole="button"
            accessibilityState={{ disabled: off }}
            testID="similar-done"
          >
            <Text style={styles.primaryText}>{t('method.similar.done')}</Text>
          </Pressable>
        </View>
      );
    }
    case 'repair': {
      const st = f.stages[p.stage];
      return st ? (
        // The worksheet and the list dim their own controls.
        <View
          style={st.type === 'line' || st.type === 'list' ? undefined : dim}
        >
          <RepairInput st={st} seed={`${step.id}.${p.stage}`} {...p} />
        </View>
      ) : null;
    }
  }
}

/** One stage of a repair script: read and acknowledge, list, write, pick, or look at a picture. */
function RepairInput({
  st,
  seed,
  ...p
}: InputProps & { st: RepairStage; seed: string }) {
  const { t } = useTranslation();
  const ok = (onPress: () => void, testID: string) => (
    <Pressable
      onPress={onPress}
      disabled={p.waiting}
      style={styles.primary}
      accessibilityRole="button"
      accessibilityState={{ disabled: p.waiting }}
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
            disabled={p.waiting}
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
            disabled={p.waiting}
            busy={p.lineBusy}
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
  hisChip: {
    alignSelf: theme.reading.endAlign,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.xxs,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.line,
    borderColor: theme.color.pen,
    backgroundColor: theme.color.card,
  },
  hisChipText: {
    ...theme.font.small,
    color: theme.color.pen,
    writingDirection: 'rtl',
  },
  fold: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.thin,
    borderColor: theme.color.border,
    backgroundColor: theme.color.surfaceCard,
  },
  foldMark: { ...theme.font.small, color: theme.color.textSecondary },
  preview: {
    flex: 1,
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
  },
  previewMark: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textSecondary,
  },
  previewText: { flex: 1 },
  previewPlain: {
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
  // The paper while a small box is open: kept, not shown (the bar says where it went).
  hidden: { display: 'none' },
  paperFolded: {
    minHeight: theme.size.touch,
    justifyContent: 'center',
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderStyle: 'dashed',
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.surfaceMuted,
  },
  paperFoldedText: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
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
  // Off while an answer is on its way: dimmed, and announced as disabled.
  off: { opacity: theme.opacity.disabled },
  busyRow: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
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
