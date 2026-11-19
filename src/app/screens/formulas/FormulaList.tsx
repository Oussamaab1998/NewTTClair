/**
 * The formulas of a theme (mockup 2) and its hide mode (mockup 3).
 * The list: the Vérif rapide card when rules are due, the filters, then one
 * group per chapter (his year first, «Rappel de …» for the year before);
 * a row opens the rule card. The hide mode covers each formula: he says it
 * in his head, then looks. «Je savais» is his own word, so it never changes
 * a status; «Je ne savais pas» only brings the rule up the next time.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ruleLatex } from '../../../formulas/display';
import {
  dueWords,
  LIST_FILTERS,
  type ListFilter,
  type ListGroup,
  type RulePlace,
} from '../../../formulas/session';
import { theme } from '../../../theme';
import {
  Bar,
  Button,
  DueText,
  Formula,
  FormulasHeader,
  StatusPill,
  styles,
} from './parts';

export function usePlaceLabel(): (place: RulePlace) => string {
  const { t } = useTranslation('formulas');
  return place =>
    t(place.reminder ? 'reminder' : 'group', {
      year: t(`years.${place.year}`),
      chapter: place.chapter,
    });
}

export function FormulaList({
  themeTitle,
  who,
  groups,
  filter,
  onFilter,
  now,
  dueCount,
  onCheck,
  onOpen,
  onTrain,
  onHide,
  onBack,
}: {
  themeTitle: string;
  who: string;
  groups: readonly ListGroup[];
  filter: ListFilter;
  onFilter: (f: ListFilter) => void;
  now: number;
  dueCount: number;
  onCheck: () => void;
  onOpen: (ruleId: string) => void;
  onTrain: () => void;
  onHide: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation('formulas');
  const placeLabel = usePlaceLabel();
  const empty = groups.length === 0 && filter === 'all';
  return (
    <View style={styles.root} testID="formulas-list">
      <FormulasHeader
        title={t('list.title')}
        subtitle={t('list.subtitle', { theme: themeTitle, who })}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {dueCount > 0 && (
          <View style={styles.card} testID="formulas-check-card">
            <Text style={styles.name}>{t('list.checkTitle')}</Text>
            <Text style={styles.small}>
              {t('list.checkText', {
                count: dueCount,
                minutes: Math.max(1, Math.round(Math.min(dueCount, 5) * 0.4)),
              })}
            </Text>
            <Button label={t('list.checkStart')} onPress={onCheck} testID="formulas-check-start" />
          </View>
        )}
        {empty ? (
          <Text style={styles.text} testID="formulas-empty">
            {t('list.empty')}
          </Text>
        ) : (
          <>
            <View
              style={local.filters}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('list.filtersA11y')}
            >
              {LIST_FILTERS.map(f => (
                <Pressable
                  key={f}
                  style={[local.filter, f === filter && local.filterOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: f === filter }}
                  testID={`formulas-filter-${f}`}
                  onPress={() => onFilter(f)}
                >
                  <Text style={[local.filterText, f === filter && local.filterTextOn]}>
                    {t(`list.filters.${f}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {groups.map(g => (
              <View key={g.key} style={local.group}>
                <Text style={styles.label}>{placeLabel(g.place)}</Text>
                {g.rows.map(({ rule, state }) => (
                  <Pressable
                    key={rule.id}
                    style={({ pressed }) => [styles.card, pressed && local.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={rule.name}
                    testID={`formula-row-${rule.id}`}
                    onPress={() => onOpen(rule.id)}
                  >
                    <View style={styles.cardTop}>
                      <Text style={styles.name}>{rule.name}</Text>
                      <StatusPill status={state.status} />
                    </View>
                    <Formula latex={ruleLatex(rule)} />
                    {state.status !== 'nouvelle' && <DueText words={dueWords(state, now)} />}
                  </Pressable>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
      {!empty && (
        <Bar>
          <Button label={t('list.train')} onPress={onTrain} grow testID="formulas-train" />
          <Button label={t('list.hide')} onPress={onHide} kind="quiet" testID="formulas-hide" />
        </Bar>
      )}
    </View>
  );
}

export function HideMode({
  groups,
  firstIds,
  onSaid,
  onBack,
}: {
  groups: readonly ListGroup[];
  /** Rules he did not know last time: shown first. */
  firstIds: ReadonlySet<string>;
  onSaid: (ruleId: string, knew: boolean) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation('formulas');
  const [rows] = useState(() => {
    const all = groups.flatMap(g => g.rows.map(r => r.rule));
    return [...all.filter(r => firstIds.has(r.id)), ...all.filter(r => !firstIds.has(r.id))];
  });
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  const [said, setSaid] = useState<Readonly<Record<string, boolean>>>({});
  return (
    <View style={styles.root} testID="formulas-hide-mode">
      <FormulasHeader title={t('hide.title')} subtitle={t('hide.subtitle')} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {rows.map(rule => (
          <View key={rule.id} style={styles.card} testID={`hide-row-${rule.id}`}>
            <Text style={styles.name}>{rule.name}</Text>
            {shown.has(rule.id) ? (
              <>
                <Formula latex={ruleLatex(rule)} size="reading" />
                <View style={local.said}>
                  {([true, false] as const).map(knew => (
                    <Pressable
                      key={String(knew)}
                      style={[local.filter, said[rule.id] === knew && local.filterOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: said[rule.id] === knew }}
                      testID={`hide-${knew ? 'knew' : 'didnt'}-${rule.id}`}
                      onPress={() => {
                        setSaid(s => ({ ...s, [rule.id]: knew }));
                        onSaid(rule.id, knew);
                      }}
                    >
                      <Text
                        style={[local.filterText, said[rule.id] === knew && local.filterTextOn]}
                      >
                        {knew ? t('hide.knew') : t('hide.didnt')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <Pressable
                style={local.cover}
                accessibilityRole="button"
                accessibilityLabel={t('hide.cover')}
                testID={`hide-cover-${rule.id}`}
                onPress={() => setShown(s => new Set([...s, rule.id]))}
              >
                <Text style={local.coverText}>{t('hide.cover')}</Text>
              </Pressable>
            )}
          </View>
        ))}
        <Text style={styles.small}>{t('hide.note')}</Text>
      </ScrollView>
      <Bar>
        <Button
          label={t('hide.showAll')}
          kind="quiet"
          grow
          testID="hide-show-all"
          onPress={() => setShown(new Set(rows.map(r => r.id)))}
        />
      </Bar>
    </View>
  );
}

const local = StyleSheet.create({
  filters: { flexDirection: theme.mathSide.row, flexWrap: 'wrap', gap: theme.space.xs },
  filter: {
    minHeight: theme.size.touch,
    justifyContent: 'center',
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  filterOn: { backgroundColor: theme.color.ink, borderColor: theme.color.ink },
  filterText: { ...theme.font.small, color: theme.color.textPrimary },
  filterTextOn: { color: theme.color.textOnAccent },
  group: { gap: theme.space.sm },
  pressed: { opacity: theme.opacity.pressed },
  said: { flexDirection: theme.mathSide.row, flexWrap: 'wrap', gap: theme.space.xs },
  cover: {
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.line,
    borderStyle: 'dashed',
    borderColor: theme.color.draft.border,
    backgroundColor: theme.color.highlighterSoft,
  },
  coverText: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.draft.text,
  },
});
