/**
 * A run of drills (mockups 4 to 8): «S’entraîner» (mode `drill`, with help)
 * and the Vérif rapide (mode `check`: no help, a short mark after each
 * tap). One shell: header, progress, the question card with its tab, the
 * feedback, the bottom bar. Each item's first answer is recorded once
 * (`onAnswer`); in «Calcule» a press on «ما نعرفش» before a right line is
 * recorded as such, and he can still finish the line.
 */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  drillItem,
  judgeCalc,
  type CalcItem,
  type CompleteItem,
  type DrillItem,
  type RecogniseItem,
  type TrueFalseItem,
} from '../../../formulas/drills/drills';
import type { FormulaAnswer } from '../../../formulas/log';
import type { FormulaRule } from '../../../formulas/schema';
import { tapVerdict, type PlannedItem, type TapChoice } from '../../../formulas/session';
import { MathBlock } from '../../../lesson/math/MathBlock';
import { Worksheet } from '../../../lesson/worksheet/Worksheet';
import {
  emptyPage,
  fixLine,
  markLine,
  writeLine,
  type LineMark,
  type Page,
  type SheetStep,
} from '../../../lesson/worksheet/model';
import { theme } from '../../../theme';
import { Bar, Button, Formula, FormulasHeader, Note, styles } from './parts';

export type Recorded = Pick<FormulaAnswer, 'kind' | 'verdict' | 'trapId'>;

export interface SessionResult {
  ruleId: string;
  verdict: FormulaAnswer['verdict'];
}

interface ItemState {
  /** The first answer, recorded. */
  first: Recorded | null;
  /** The tap shown (tap drills). */
  tap: TapChoice | null;
  /** «Calcule»: the page, the last verdict, the help level reached, solved. */
  page: Page;
  last: ReturnType<typeof judgeCalc> | null;
  help: 0 | 1 | 2 | 3;
  solved: boolean;
}

const freshItem = (): ItemState => ({
  first: null,
  tap: null,
  page: emptyPage(),
  last: null,
  help: 0,
  solved: false,
});

export function DrillSession({
  mode,
  title,
  name,
  plan,
  rules,
  pool,
  onAnswer,
  onEnd,
  onClose,
}: {
  mode: 'drill' | 'check';
  title: string;
  /** The rule's name or the theme's title, in the subtitle. */
  name: string;
  plan: readonly PlannedItem[];
  rules: ReadonlyMap<string, FormulaRule>;
  pool: readonly FormulaRule[];
  onAnswer: (ruleId: string, answer: Recorded) => void;
  onEnd: (results: SessionResult[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('formulas');
  const [at, setAt] = useState(0);
  const [state, setState] = useState<ItemState>(freshItem);
  const [results, setResults] = useState<SessionResult[]>([]);
  const planned = plan[at];
  const rule = planned ? rules.get(planned.ruleId) : undefined;
  const item = useMemo(
    () => (planned && rule ? drillItem(rule, planned.kind, pool, planned.seed) : null),
    [planned, rule, pool],
  );
  if (!planned || !rule || !item) {
    return null;
  }

  const record = (r: Recorded) => {
    if (state.first !== null) {
      return;
    }
    onAnswer(rule.id, r);
    setResults(rs => [...rs, { ruleId: rule.id, verdict: r.verdict }]);
    setState(s => ({ ...s, first: r }));
  };

  const onTap = (choice: TapChoice) => {
    if (state.tap !== null) {
      return;
    }
    const v = tapVerdict(item, choice);
    record({ kind: item.kind, ...v });
    setState(s => ({ ...s, tap: choice }));
  };

  const next = () => {
    if (at + 1 >= plan.length) {
      onEnd(results);
      return;
    }
    setAt(at + 1);
    setState(freshItem());
  };

  const answered =
    item.kind === 'calc' ? state.solved || state.help === 3 : state.tap !== null;

  return (
    <View style={styles.root} testID={`formulas-${mode}`}>
      <FormulasHeader
        title={title}
        subtitle={t('drill.progress', { name, at: at + 1, total: plan.length })}
        onBack={onClose}
        mark="close"
      />
      {mode === 'drill' ? (
        <Segments total={plan.length} done={at + (answered ? 1 : 0)} />
      ) : (
        <Dots results={results} total={plan.length} at={at} />
      )}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.questionCard} testID={`drill-${item.kind}`}>
          <View style={styles.questionTab}>
            <Text style={styles.questionTabText}>{t(`drill.tab.${item.kind}`)}</Text>
          </View>
          <Text style={styles.prompt}>{t(`drill.prompt.${item.kind}`)}</Text>
          {item.kind === 'complete' && (
            <CompleteBody item={item} tap={state.tap} onTap={onTap} />
          )}
          {item.kind === 'true_false' && (
            <TrueFalseBody item={item} tap={state.tap} onTap={onTap} />
          )}
          {item.kind === 'recognise' && (
            <RecogniseBody item={item} tap={state.tap} onTap={onTap} />
          )}
          {item.kind === 'calc' && (
            <CalcBody
              item={item}
              rule={rule}
              state={state}
              onLine={(raw, nodes, fixes) => {
                const verdict = judgeCalc(item, raw);
                const out = fixes ? fixLine(state.page, fixes, nodes) : writeLine(state.page, CALC_STEP, nodes);
                if (!out) {
                  return;
                }
                const mark: LineMark =
                  verdict.verdict === 'right'
                    ? 'right'
                    : verdict.verdict === 'unreadable'
                      ? 'neutral'
                      : 'wrong';
                if (verdict.verdict !== 'unreadable') {
                  record({
                    kind: 'calc',
                    verdict: verdict.verdict,
                    ...(verdict.verdict === 'trap' ? { trapId: verdict.trapId } : {}),
                  });
                }
                setState(s => ({
                  ...s,
                  page: markLine(out.page, out.line.id, mark),
                  last: verdict,
                  solved: s.solved || verdict.verdict === 'right',
                }));
              }}
            />
          )}
          {state.tap !== null && mode === 'check' ? (
            <CheckMark correct={state.first?.verdict === 'right'} />
          ) : (
            state.tap !== null && <TapFeedback item={item} rule={rule} tap={state.tap} />
          )}
        </View>
        {mode === 'check' && <Text style={styles.small}>{t('check.noHelp')}</Text>}
      </ScrollView>
      <Bar>
        {answered && (
          <Button
            label={mode === 'check' ? t('check.next') : t('drill.continue')}
            onPress={next}
            grow
            testID="drill-continue"
          />
        )}
        {mode === 'drill' && item.kind === 'calc' && !state.solved && state.help < 3 && (
          <Button
            label={t('drill.help')}
            kind="dashed"
            grow={!answered}
            testID="drill-help"
            onPress={() => {
              record({ kind: 'calc', verdict: 'dont_know' });
              setState(s => ({ ...s, help: (s.help + 1) as ItemState['help'] }));
            }}
          />
        )}
      </Bar>
    </View>
  );
}

const CALC_STEP: SheetStep = { id: 'derivative', label: { fr: 'f′(x)' } };

function Segments({ total, done }: { total: number; done: number }) {
  return (
    <View style={local.segments}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[local.segment, i < done && local.segmentOn]} />
      ))}
    </View>
  );
}

function Dots({
  results,
  total,
  at,
}: {
  results: readonly SessionResult[];
  total: number;
  at: number;
}) {
  return (
    <View style={local.dots}>
      {Array.from({ length: total }, (_, i) => {
        const r = results[i];
        const mark = r
          ? r.verdict === 'right'
            ? theme.feedback.success.icon
            : theme.feedback.danger.icon
          : String(i + 1);
        return (
          <View
            key={i}
            style={[
              local.dot,
              r && (r.verdict === 'right' ? local.dotRight : local.dotWrong),
              !r && i === at && local.dotNow,
            ]}
          >
            <Text style={local.dotText}>{mark}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Option({
  selected,
  correct,
  onPress,
  testID,
  children,
}: {
  selected: boolean;
  /** After the answer: this is the right one (its mark shows). */
  correct: boolean;
  onPress: () => void;
  testID: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      style={[local.option, selected && local.optionOn]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
    >
      {children}
      {correct && <Text style={local.optionMark}>{theme.feedback.success.icon}</Text>}
    </Pressable>
  );
}

function CompleteBody({
  item,
  tap,
  onTap,
}: {
  item: CompleteItem;
  tap: TapChoice | null;
  onTap: (c: TapChoice) => void;
}) {
  const picked = tap?.kind === 'complete' ? tap.tile : null;
  return (
    <>
      <Formula latex={item.latex} size="title" />
      <View style={local.tiles}>
        {item.tiles.map((tile, i) => (
          <View key={i} style={local.tileCell}>
            <Option
              selected={picked === i}
              correct={picked !== null && tile.right}
              onPress={() => onTap({ kind: 'complete', tile: i })}
              testID={`drill-tile-${i}`}
            >
              <MathBlock latex={tile.latex} fontSize={theme.font.size.reading} />
            </Option>
          </View>
        ))}
      </View>
    </>
  );
}

function TrueFalseBody({
  item,
  tap,
  onTap,
}: {
  item: TrueFalseItem;
  tap: TapChoice | null;
  onTap: (c: TapChoice) => void;
}) {
  const { t } = useTranslation('formulas');
  const said = tap?.kind === 'true_false' ? tap.saidTrue : null;
  return (
    <>
      <Formula latex={item.latex} size="title" />
      <View style={local.tiles}>
        {([true, false] as const).map(v => (
          <View key={String(v)} style={local.tileCell}>
            <Option
              selected={said === v}
              correct={said !== null && v === item.isTrue}
              onPress={() => onTap({ kind: 'true_false', saidTrue: v })}
              testID={`drill-${v ? 'true' : 'false'}`}
            >
              <Text style={styles.name}>{v ? t('drill.true') : t('drill.false')}</Text>
            </Option>
          </View>
        ))}
      </View>
    </>
  );
}

function RecogniseBody({
  item,
  tap,
  onTap,
}: {
  item: RecogniseItem;
  tap: TapChoice | null;
  onTap: (c: TapChoice) => void;
}) {
  const picked = tap?.kind === 'recognise' ? tap.ruleId : null;
  return (
    <>
      <Formula latex={item.f} size="title" />
      {item.options.map(o => (
        <Option
          key={o.ruleId}
          selected={picked === o.ruleId}
          correct={picked !== null && o.right}
          onPress={() => onTap({ kind: 'recognise', ruleId: o.ruleId })}
          testID={`drill-option-${o.ruleId}`}
        >
          <MathBlock latex={o.latex} fontSize={theme.font.size.body} />
        </Option>
      ))}
    </>
  );
}

function TapFeedback({
  item,
  rule,
  tap,
}: {
  item: DrillItem;
  rule: FormulaRule;
  tap: TapChoice;
}) {
  const { t } = useTranslation('formulas');
  const right = tapVerdict(item, tap).verdict === 'right';
  if (item.kind === 'complete') {
    return right ? (
      <Note tone="ok" title={t('drill.right')} testID="drill-feedback">
        <Text style={styles.text}>{rule.say}</Text>
      </Note>
    ) : (
      <Note tone="err" title={t('drill.notQuite')} testID="drill-feedback">
        <Formula latex={item.answer} size="reading" />
      </Note>
    );
  }
  if (item.kind === 'true_false') {
    if (item.isTrue) {
      return (
        <Note
          tone={right ? 'ok' : 'err'}
          title={right ? t('drill.isRule') : t('drill.wasRule')}
          testID="drill-feedback"
        />
      );
    }
    const c = item.counterexample;
    const trap = rule.traps.find(x => x.id === item.trapId);
    return (
      <Note
        tone={right ? 'ok' : 'err'}
        title={t(right ? 'drill.counter' : 'drill.counterWrong', { x: c?.x ?? '' })}
        testID="drill-feedback"
      >
        {c && (
          <>
            {c.parts.map(p => (
              <Formula key={p} latex={p} />
            ))}
            <Formula latex={c.truth} />
            <Formula latex={c.trap} />
          </>
        )}
        {trap && <Text style={styles.text}>{trap.why}</Text>}
        <Formula latex={item.answer} size="reading" />
      </Note>
    );
  }
  if (item.kind === 'recognise') {
    const good = item.options.find(o => o.right);
    return right ? (
      <Note tone="ok" title={t('drill.recogniseRight')} testID="drill-feedback">
        {item.parts.map(p => (
          <Formula key={p} latex={p} />
        ))}
      </Note>
    ) : (
      <Note tone="err" title={t('drill.recogniseWrong')} testID="drill-feedback">
        {good && <Formula latex={good.latex} />}
      </Note>
    );
  }
  return null;
}

function CheckMark({ correct }: { correct: boolean }) {
  const { t } = useTranslation('formulas');
  return (
    <Note
      tone={correct ? 'ok' : 'err'}
      title={correct ? t('drill.right') : t('check.noted')}
      testID="check-mark"
    />
  );
}

function CalcBody({
  item,
  rule,
  state,
  onLine,
}: {
  item: CalcItem;
  rule: FormulaRule;
  state: ItemState;
  onLine: (raw: string, nodes: Parameters<typeof writeLine>[2], fixes: string | null) => void;
}) {
  const { t } = useTranslation('formulas');
  const last = state.last;
  const trap =
    last?.verdict === 'trap' ? rule.traps.find(x => x.id === last.trapId) : undefined;
  // The verdict and the help sit above the sheet: the keypad fills the screen
  // below it, and he must see them right after «نثبّت».
  return (
    <>
      <Formula latex={item.f} size="title" />
      {last?.verdict === 'right' && (
        <Note tone="ok" title={t('drill.calcRight')} testID="drill-feedback" />
      )}
      {trap && (
        <Note tone="err" title={trap.title} testID="drill-feedback">
          <Text style={styles.text}>{trap.why}</Text>
        </Note>
      )}
      {last?.verdict === 'wrong' && (
        <Note tone="err" title={t('drill.calcWrong')} testID="drill-feedback" />
      )}
      {last?.verdict === 'unreadable' && (
        <Note tone="draft" title={t('drill.calcUnreadable')} testID="drill-feedback" />
      )}
      <HelpCards item={item} level={state.help} />
      <Worksheet
        step={CALC_STEP}
        prompt={null}
        lines={state.page.lines}
        tiles={NO_TILES}
        scaffold={null}
        letters="x"
        readonly={state.solved || state.help === 3}
        onSubmit={(raw, info) => onLine(raw, info.nodes, info.fixes)}
        testID="drill-worksheet"
      />
    </>
  );
}

const NO_TILES: readonly never[] = [];

function HelpCards({ item, level }: { item: CalcItem; level: number }) {
  const { t } = useTranslation('formulas');
  return (
    <>
      {item.help.slice(0, level).map((lines, i) => (
        <View key={i} style={styles.card} testID={`drill-help-${i + 1}`}>
          <Text style={styles.label}>{t(`drill.helpTitle.${(i + 1) as 1 | 2 | 3}`)}</Text>
          {lines.map(l => (
            <Formula key={l} latex={l} />
          ))}
        </View>
      ))}
    </>
  );
}

const local = StyleSheet.create({
  segments: {
    flexDirection: theme.reading.row,
    gap: theme.space.xxs,
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.space.sm,
  },
  segment: {
    flex: 1,
    height: theme.size.progressBar,
    borderRadius: theme.radius.xs,
    backgroundColor: theme.color.border,
  },
  segmentOn: { backgroundColor: theme.color.pen },
  dots: {
    flexDirection: theme.mathSide.row,
    justifyContent: 'center',
    gap: theme.space.sm,
    paddingTop: theme.space.sm,
  },
  dot: {
    width: theme.size.ladderMark,
    height: theme.size.ladderMark,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRight: { borderColor: theme.color.correct.ink, backgroundColor: theme.color.correct.bg },
  dotWrong: { borderColor: theme.color.error.noteBorder, backgroundColor: theme.color.error.noteBg },
  dotNow: { borderColor: theme.color.ink, backgroundColor: theme.color.highlighter },
  dotText: { ...theme.font.small, fontFamily: theme.font.family.ui.bold, color: theme.color.textPrimary },
  tiles: { flexDirection: theme.mathSide.row, flexWrap: 'wrap', gap: theme.space.sm },
  tileCell: { flexBasis: '45%', flexGrow: 1 },
  option: {
    minHeight: theme.size.touch,
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.xs,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.button,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  optionOn: {
    backgroundColor: theme.color.highlighter,
    borderColor: theme.color.ink,
    borderWidth: theme.border.active,
  },
  optionMark: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.correct.ink,
  },
});
