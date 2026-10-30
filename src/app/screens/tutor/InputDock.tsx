/**
 * What the student does now: the widget the tutor asked for (calculation
 * pad, options, cards to order, a word to tap, a list to build, a formula, a
 * continue button; a component lives in the tutor's message and only its
 * «كمّلت» is here), and, whatever the widget, a free-text bar and the
 * «ما نعرفش» chip. Disabled while the tutor is thinking.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { StudentAct } from '../../../ai/checks/autoCheck';
import type { AskInput } from '../../../ai/tools/schemas';
import { LineInput } from '../../../lesson/feed/method/LineInput';
import { ListBuilder } from '../../../lesson/feed/method/ListBuilder';
import { PlanCards } from '../../../lesson/feed/method/PlanCards';
import { StatementTap } from '../../../lesson/feed/method/StatementTap';
import { RichView } from '../../../lesson/feed/RichView';
import { isolateLlmRuns } from '../../../lesson/rich/runs';
import { theme } from '../../../theme';

export type OnAct = (act: StudentAct, shown: string, line?: boolean) => void;

const MAX_TEXT = 500;
/** Send: an arrow toward the reading direction (shape cue; the label is for screen readers). */
const SEND_MARK = '←';
/** Formula placeholder: notation, not words (no i18n). */
const FORMULA_HINT = 'C(n,k) × (1/2)^n';

/** Option and card text from the model: Arabic with isolated French runs. */
const richOf = (text: string) => ({
  ar: isolateLlmRuns([{ ar: text }]) ?? [{ ar: text }],
});

function FormulaInput({ onAct }: { onAct: OnAct }) {
  const { t } = useTranslation();
  const [raw, setRaw] = useState('');
  const submit = () => {
    const v = raw.trim();
    if (v !== '') {
      setRaw('');
      onAct({ kind: 'formula', raw: v }, v, true);
    }
  };
  return (
    <View style={styles.formulaRow}>
      <TextInput
        style={styles.formula}
        value={raw}
        onChangeText={setRaw}
        placeholder={FORMULA_HINT}
        placeholderTextColor={theme.color.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={120}
        testID="ai-formula"
      />
      <Pressable
        style={styles.button}
        accessibilityRole="button"
        testID="ai-formula-send"
        onPress={submit}
      >
        <Text style={styles.buttonText}>{t('ai.send')}</Text>
      </Pressable>
    </View>
  );
}

function Widget({
  input,
  caseBalls,
  onAct,
  onFinishComponent,
}: {
  input: AskInput;
  caseBalls: (caseId: string) => { id: string; label: string }[];
  onAct: OnAct;
  onFinishComponent: (shown: string) => void;
}) {
  const { t } = useTranslation();
  switch (input.kind) {
    case 'line':
      return (
        <LineInput
          readonly={false}
          testID="ai-line"
          onSubmit={(raw, readback) =>
            onAct(
              { kind: 'line', raw, ...(readback && { readback }) },
              raw,
              true,
            )
          }
        />
      );
    case 'choice':
      return (
        <View style={styles.widget}>
          {input.options.map(o => (
            <Pressable
              key={o.id}
              style={styles.option}
              accessibilityRole="button"
              testID={`ai-option-${o.id}`}
              onPress={() => onAct({ kind: 'choice', optionId: o.id }, o.text)}
            >
              <RichView rich={richOf(o.text)} mathScroll={false} />
            </Pressable>
          ))}
        </View>
      );
    case 'order': {
      const textOf = (id: string) =>
        input.cards.find(c => c.id === id)?.text ?? id;
      return (
        <PlanCards
          pool={input.cards.map(c => ({ id: c.id, text: richOf(c.text) }))}
          readonly={false}
          min={Math.min(2, input.cards.length)}
          max={input.cards.length}
          testID="ai-order"
          onSubmit={ids =>
            onAct({ kind: 'order', ids }, ids.map(textOf).join(' / '))
          }
        />
      );
    }
    case 'tap_word':
      return (
        <StatementTap
          sentence={input.sentence_fr}
          readonly={false}
          testID="ai-tap"
          onTap={token => onAct({ kind: 'tap_word', token }, token)}
        />
      );
    case 'list':
      return (
        <ListBuilder
          balls={caseBalls(input.case_id)}
          size={input.size}
          readonly={false}
          testID="ai-list"
          onSubmit={groups =>
            onAct(
              { kind: 'list', groups },
              groups.map(g => g.join(' ')).join(', '),
            )
          }
        />
      );
    case 'formula':
      return <FormulaInput onAct={onAct} />;
    case 'component':
      return (
        <Pressable
          style={styles.button}
          accessibilityRole="button"
          testID="ai-component-done"
          onPress={() => onFinishComponent(t('ai.done'))}
        >
          <Text style={styles.buttonText}>{t('ai.done')}</Text>
        </Pressable>
      );
    case 'continue':
      return (
        <Pressable
          style={styles.button}
          accessibilityRole="button"
          testID="ai-continue"
          onPress={() => onAct({ kind: 'continue' }, t('ai.continue'))}
        >
          <Text style={styles.buttonText}>{t('ai.continue')}</Text>
        </Pressable>
      );
    case 'free':
      return null;
  }
}

export function InputDock({
  input,
  disabled,
  caseBalls,
  onAct,
  onFinishComponent,
}: {
  input: AskInput | null;
  disabled: boolean;
  caseBalls: (caseId: string) => { id: string; label: string }[];
  onAct: OnAct;
  onFinishComponent: (shown: string) => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const sendText = () => {
    const v = text.trim();
    if (v === '' || disabled) {
      return;
    }
    setText('');
    onAct({ kind: 'free', text: v }, v);
  };
  return (
    <View
      style={[styles.dock, disabled && styles.disabled]}
      pointerEvents={disabled ? 'none' : 'auto'}
      testID="ai-dock"
    >
      {input && (
        <Widget
          input={input}
          caseBalls={caseBalls}
          onAct={onAct}
          onFinishComponent={onFinishComponent}
        />
      )}
      <View style={styles.bar}>
        <Pressable
          style={styles.chip}
          accessibilityRole="button"
          testID="ai-dont-know"
          onPress={() => onAct({ kind: 'dont_know' }, t('ai.dontKnow'))}
        >
          <Text style={styles.chipText}>{t('ai.dontKnow')}</Text>
        </Pressable>
        <TextInput
          style={styles.field}
          value={text}
          onChangeText={setText}
          placeholder={t('ai.placeholder')}
          placeholderTextColor={theme.color.textSecondary}
          maxLength={MAX_TEXT}
          multiline
          testID="ai-text"
        />
        <Pressable
          style={styles.send}
          accessibilityRole="button"
          accessibilityLabel={t('ai.send')}
          testID="ai-send"
          onPress={sendText}
        >
          <Text style={styles.sendText}>{SEND_MARK}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    borderTopColor: theme.color.borderDefault,
    borderTopWidth: theme.border.line,
    backgroundColor: theme.color.backgroundApp,
    padding: theme.space.md,
    gap: theme.space.sm,
  },
  disabled: { opacity: theme.opacity.disabled },
  widget: { gap: theme.space.sm },
  option: {
    borderColor: theme.color.borderDefault,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.button,
    padding: theme.space.md,
    backgroundColor: theme.color.surfaceCard,
    minHeight: theme.size.touch,
  },
  button: {
    alignSelf: theme.reading.startAlign,
    backgroundColor: theme.color.actionPrimary,
    borderRadius: theme.radius.button,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.xxl,
    minHeight: theme.size.touch,
    justifyContent: 'center',
  },
  buttonText: {
    ...theme.font.body,
    color: theme.color.textOnAccent,
  },
  formulaRow: {
    flexDirection: theme.mathSide.row,
    alignItems: 'center',
    gap: theme.space.sm,
  },
  formula: {
    flex: 1,
    ...theme.font.paper,
    color: theme.color.textPrimary,
    borderColor: theme.color.actionPrimary,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.space.md,
    minHeight: theme.size.touch,
    textAlign: 'left',
    writingDirection: 'ltr',
    backgroundColor: theme.color.surfaceCard,
  },
  bar: {
    flexDirection: theme.reading.row,
    alignItems: 'flex-end',
    gap: theme.space.sm,
  },
  chip: {
    borderColor: theme.color.borderDefault,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.chip,
    paddingHorizontal: theme.space.md,
    minHeight: theme.size.touch,
    justifyContent: 'center',
    backgroundColor: theme.color.surfaceCard,
  },
  chipText: { ...theme.font.small, color: theme.color.textPrimary },
  field: {
    flex: 1,
    ...theme.font.body,
    color: theme.color.textPrimary,
    borderColor: theme.color.borderDefault,
    borderWidth: theme.border.line,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.space.md,
    minHeight: theme.size.touch,
    textAlign: 'right',
    backgroundColor: theme.color.surfaceCard,
  },
  send: {
    backgroundColor: theme.color.actionPrimary,
    borderRadius: theme.radius.pill,
    width: theme.size.touch,
    height: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { ...theme.font.header, color: theme.color.textOnAccent },
});
