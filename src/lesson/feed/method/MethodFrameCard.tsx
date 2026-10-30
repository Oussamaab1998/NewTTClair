/**
 * The body of a method frame inside the question card: the plan cards, the
 * tappable sentence, the lines so far plus the line pad, a pick of sentence
 * cards, the recipe, a similar question, or one stage of a repair script.
 * The frame header (one line: what now, and why) sits above the prompt.
 */
import React, { useMemo, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ComponentHandle } from '../../../components/contract';
import type { ComponentSpec } from '../../../components/contract';
import type { MethodFrameStep, RepairStage } from '../../../content/schema';
import { fractionToPlain } from '../../../engine/format';
import { checkPlan } from '../../../method/frame';
import { lineLatex } from '../../../method/lineChain';
import { ballsOf } from '../../../method/repair';
import { seededOrder } from '../../../method/shuffle';
import { buildGraphFor } from '../../../method/templates';
import { theme } from '../../../theme';
import type { MethodValue } from '../../session/types';
import { MathBlock } from '../../math/MathBlock';
import { RichView } from '../RichView';
import { CardsPick } from './CardsPick';
import { LineInput } from './LineInput';
import { ListBuilder } from './ListBuilder';
import { PlanCards } from './PlanCards';
import { StatementTap } from './StatementTap';

export function FrameHeader({ step }: { step: MethodFrameStep }) {
  if (!step.header) {
    return null;
  }
  return (
    <View style={styles.header} testID="frame-header">
      <RichView
        rich={step.header.now}
        fontSize={theme.font.size.small}
        fontFamily={theme.font.family.ui.bold}
      />
      <RichView
        rich={step.header.why}
        fontSize={theme.font.size.small}
        color={theme.color.textSecondary}
      />
    </View>
  );
}

interface Props {
  step: MethodFrameStep;
  active: boolean;
  /** Credited lines so far (lines frames), the recorded answer once done. */
  lines: readonly string[] | undefined;
  result: { raw?: string; optionId?: string } | undefined;
  restored: Record<string, unknown> | undefined;
  /** A repair script: the stage he is at. */
  stage: number | undefined;
  onSubmit: (value: MethodValue) => void;
  /** A picture inside a repair stage (the question card owns the component host). */
  renderComponent: (spec: ComponentSpec) => ReactNode;
  handle: Ref<ComponentHandle>;
}

export function MethodFrameCard({
  step,
  active,
  lines,
  result,
  restored,
  stage,
  onSubmit,
  renderComponent,
  handle,
}: Props) {
  const { t } = useTranslation();
  const f = step.frame;
  const pool = useMemo(() => {
    if (f.type === 'plan') {
      const ids = f.cards.map(c => c.id);
      const order = seededOrder(ids, step.id, o => checkPlan(f.cards, o).ok);
      const byId = new Map(f.cards.map(c => [c.id, c]));
      return order.map(id => ({ id, text: byId.get(id)!.text }));
    }
    if (f.type === 'recipe') {
      const order = seededOrder(
        f.pool.map(c => c.id),
        step.id,
      );
      const byId = new Map(f.pool.map(c => [c.id, c]));
      return order.map(id => ({ id, text: byId.get(id)!.text }));
    }
    return [];
  }, [f, step.id]);

  if (f.type === 'plan') {
    const recorded = result?.raw ? result.raw.split(',') : undefined;
    const placed = Array.isArray(restored?.placed)
      ? (restored!.placed as string[])
      : recorded;
    return (
      <PlanCards
        pool={pool}
        readonly={!active}
        {...(placed && { placed })}
        onSubmit={order => onSubmit({ plan: order })}
        ref={handle}
      />
    );
  }
  if (f.type === 'recipe') {
    const recorded = result?.raw ? result.raw.split(',') : undefined;
    const placed = Array.isArray(restored?.placed)
      ? (restored!.placed as string[])
      : recorded;
    return (
      <PlanCards
        pool={pool}
        readonly={!active}
        min={3}
        max={5}
        labels={{
          slot: 'method.recipe.slot',
          pool: 'method.recipe.pool',
          confirm: 'method.recipe.confirm',
        }}
        {...(placed && { placed })}
        onSubmit={ids => onSubmit({ recipe: ids })}
        testID="recipe-cards"
        ref={handle}
      />
    );
  }
  if (f.type === 'read') {
    return (
      <StatementTap
        sentence={f.sentence}
        readonly={!active}
        {...(result?.raw !== undefined && { chosen: result.raw })}
        onTap={token => onSubmit({ token })}
      />
    );
  }
  if (f.type === 'cards') {
    return (
      <CardsPick
        cards={f.cards}
        seed={step.id}
        readonly={!active}
        {...(result?.optionId !== undefined && { chosen: result.optionId })}
        onPick={id => onSubmit({ card: id })}
      />
    );
  }
  if (f.type === 'similar') {
    return (
      <View style={styles.lines}>
        <CreditedLines lines={lines} />
        <LineInput
          readonly={!active}
          {...(typeof restored?.raw === 'string' && {
            initialRaw: restored.raw,
          })}
          onSubmit={raw => onSubmit({ sline: raw })}
          ref={handle}
        />
        {active && (
          <Pressable
            onPress={() => onSubmit({ submit: true })}
            disabled={(lines ?? []).length === 0}
            style={[
              styles.confirm,
              (lines ?? []).length === 0 && styles.confirmOff,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: (lines ?? []).length === 0 }}
            testID="similar-done"
          >
            <Text style={styles.confirmText}>{t('method.similar.done')}</Text>
          </Pressable>
        )}
      </View>
    );
  }
  if (f.type === 'repair') {
    const st = f.stages[stage ?? 0];
    if (!st) {
      return null;
    }
    return (
      <RepairStageView
        stage={st}
        seed={`${step.id}.${stage ?? 0}`}
        active={active}
        lines={lines}
        restored={restored}
        onSubmit={onSubmit}
        renderComponent={renderComponent}
        handle={handle}
      />
    );
  }
  return (
    <View style={styles.lines}>
      <CreditedLines lines={lines} />
      <LineInput
        readonly={!active}
        {...(typeof restored?.raw === 'string' && { initialRaw: restored.raw })}
        onSubmit={(raw, readback) =>
          onSubmit({ mline: raw, ...(readback && { readback }) })
        }
        ref={handle}
      />
    </View>
  );
}

function CreditedLines({ lines }: { lines: readonly string[] | undefined }) {
  return (
    <>
      {(lines ?? []).map((raw, i) => (
        <View
          key={`${raw}-${i}`}
          style={styles.line}
          testID={`credited-line-${i}`}
        >
          <MathBlock latex={lineLatex(raw)} fontSize={theme.font.size.body} />
        </View>
      ))}
    </>
  );
}

/** Lines of a graph the engine builds (a worked example on another urn): each as `form = value`. */
function WorkedLines({
  worked,
}: {
  worked: {
    graph: { template: string; args: Record<string, unknown> };
    nodes: string[];
  };
}) {
  const { t } = useTranslation();
  const lines = useMemo(() => {
    try {
      const g = buildGraphFor(worked.graph, { inputs: {} });
      return worked.nodes.flatMap(id => {
        const n = g.nodes.find(x => x.id === id);
        return n && n.forms[0]
          ? [{ id, text: `${n.forms[0]} = ${fractionToPlain(n.value)}` }]
          : [];
      });
    } catch {
      return [];
    }
  }, [worked]);
  return (
    <View style={styles.lines} testID="worked-lines">
      {lines.map(l => (
        <View key={l.id} style={styles.line}>
          <Text style={styles.nodeLabel}>
            {t(`method.node.${l.id}`, { defaultValue: l.id })}
          </Text>
          <MathBlock
            latex={lineLatex(l.text)}
            fontSize={theme.font.size.body}
          />
        </View>
      ))}
    </View>
  );
}

interface StageProps {
  stage: RepairStage;
  seed: string;
  active: boolean;
  lines: readonly string[] | undefined;
  restored: Record<string, unknown> | undefined;
  onSubmit: (value: MethodValue) => void;
  renderComponent: (spec: ComponentSpec) => ReactNode;
  handle: Ref<ComponentHandle>;
}

/** One stage of a repair script: read, list, write a line, pick a card, or a picture. */
function RepairStageView({
  stage: st,
  seed,
  active,
  lines,
  restored,
  onSubmit,
  renderComponent,
  handle,
}: StageProps) {
  const { t } = useTranslation();
  if (st.type === 'show') {
    return (
      <View style={styles.lines}>
        <RichView rich={st.text} />
        {st.worked && <WorkedLines worked={st.worked} />}
        {active && (
          <Pressable
            onPress={() => onSubmit({ ack: true })}
            style={styles.confirm}
            accessibilityRole="button"
            testID="repair-ack"
          >
            <Text style={styles.confirmText}>{t('method.show.ok')}</Text>
          </Pressable>
        )}
      </View>
    );
  }
  if (st.type === 'list') {
    const balls = ballsOf(st.reds, st.blacks);
    return (
      <View style={styles.lines}>
        <RichView rich={st.prompt} fontFamily={theme.font.family.ui.bold} />
        <ListBuilder
          balls={balls}
          size={st.k}
          readonly={!active}
          onSubmit={list => onSubmit({ list })}
        />
      </View>
    );
  }
  if (st.type === 'line') {
    return (
      <View style={styles.lines}>
        <RichView rich={st.prompt} fontFamily={theme.font.family.ui.bold} />
        <CreditedLines lines={lines} />
        <LineInput
          readonly={!active}
          {...(typeof restored?.raw === 'string' && {
            initialRaw: restored.raw,
          })}
          onSubmit={(raw, readback) =>
            onSubmit({ mline: raw, ...(readback && { readback }) })
          }
          ref={handle}
        />
      </View>
    );
  }
  if (st.type === 'cards') {
    return (
      <View style={styles.lines}>
        <RichView rich={st.prompt} fontFamily={theme.font.family.ui.bold} />
        <CardsPick
          cards={st.cards}
          seed={seed}
          readonly={!active}
          onPick={id => onSubmit({ card: id })}
        />
      </View>
    );
  }
  return (
    <View style={styles.lines}>
      {st.prompt && (
        <RichView rich={st.prompt} fontFamily={theme.font.family.ui.bold} />
      )}
      {renderComponent(st.component)}
      {active && (
        <Pressable
          onPress={() => onSubmit({ explored: true })}
          style={styles.confirm}
          accessibilityRole="button"
          testID="repair-looked"
        >
          <Text style={styles.confirmText}>{t('method.show.ok')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: theme.space.xs, marginBottom: theme.space.xs },
  lines: { gap: theme.space.xs },
  line: {
    borderBottomWidth: theme.border.line,
    borderBottomColor: theme.color.gridLine,
    paddingVertical: theme.space.xs,
  },
  nodeLabel: {
    color: theme.color.textSecondary,
    fontFamily: theme.font.family.ui.regular,
    fontSize: theme.font.size.small,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  confirm: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmOff: { backgroundColor: theme.color.inkDisabled },
  confirmText: {
    color: theme.color.textOnAccent,
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
  },
});
