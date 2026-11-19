/**
 * The rule card (mockup 3, «Voir»): the formula and its condition, how it is
 * said, a worked example, its traps, and the sentence for the exam copy;
 * then «S’entraîner». Every formula here is drawn from the checked law
 * (display.ts).
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { exampleLatex, lawLatex, ruleLatex, trapLatex } from '../../../formulas/display';
import type { FormulaRule } from '../../../formulas/schema';
import { Bar, Button, Formula, FormulasHeader, Note, styles } from './parts';

export function RuleCard({
  rule,
  placeLabel,
  questions,
  onTrain,
  onBack,
}: {
  rule: FormulaRule;
  placeLabel: string;
  questions: number;
  onTrain: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation('formulas');
  const ex = exampleLatex(rule.example);
  const parts = [
    ...(rule.example.u !== undefined ? [`u=${lawLatex(rule.example.u)}`] : []),
    ...(rule.example.v !== undefined ? [`v=${lawLatex(rule.example.v)}`] : []),
    ...(rule.example.n !== undefined ? [`n=${rule.example.n}`] : []),
    ...(rule.example.k !== undefined ? [`k=${rule.example.k}`] : []),
  ];
  return (
    <View style={styles.root} testID="formula-card">
      <FormulasHeader title={rule.name} subtitle={placeLabel} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Formula latex={ruleLatex(rule)} size="title" testID="formula-card-rule" />
          {rule.condition !== undefined && (
            <Note tone="draft" title={rule.condition} />
          )}
          <Text style={styles.small}>{t('card.say', { text: rule.say })}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>{t('card.example')}</Text>
          <Formula latex={ex.f} size="reading" />
          {rule.example.where !== undefined && (
            <Text style={styles.small}>{rule.example.where}</Text>
          )}
          {parts.map(p => (
            <Formula key={p} latex={p} />
          ))}
          <Formula latex={ex.d} size="reading" />
        </View>
        <Note tone="err" title={t('card.trap')} testID="formula-card-traps">
          {rule.traps.map(trap => (
            <View key={trap.id}>
              <Text style={styles.name}>{trap.title}</Text>
              <Formula latex={trapLatex(rule, trap.id)} />
              <Text style={styles.text}>{trap.why}</Text>
            </View>
          ))}
        </Note>
        <View style={styles.card}>
          <Text style={styles.label}>{t('card.copy')}</Text>
          <Text style={styles.paper}>{rule.copy}</Text>
        </View>
      </ScrollView>
      <Bar>
        <Button
          label={t('card.train', { count: questions })}
          onPress={onTrain}
          grow
          testID="formula-card-train"
        />
      </Bar>
    </View>
  );
}
