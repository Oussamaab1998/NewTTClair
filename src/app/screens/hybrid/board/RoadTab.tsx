/**
 * «الطريق»: the question's map (TripMap, src/hybrid/tour roadView) with
 * what is done and where he is: his line under each finished step (a step
 * reused from an earlier question says where we found it), the station he
 * is on ringed with what and why under it, the later ones quieter, the
 * exercise from above folded to one line. At the end of the question, the
 * method card of its type. While the trip is shown, the same map as the
 * trip. The components he used are not reopened here for now (owner,
 * 2026-11-11).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { RoadSheet } from '../../../../hybrid/board';
import { SubLine } from '../../../../lesson/feed/method/sheetParts';
import { RichView } from '../../../../lesson/feed/RichView';
import { theme } from '../../../../theme';
import { TripMap } from '../trip/TripMap';
import { MethodCardView } from './FoundTab';

export function RoadTab({
  road,
  questionLabels,
}: {
  road: RoadSheet;
  /** The questions' labels on the exam paper, by question id. */
  questionLabels: Readonly<Record<string, string>>;
}) {
  const { t } = useTranslation();
  const extra = (cardId: string) => (
    <>
      {road.here?.cardId === cardId && road.here.now && (
        <SubLine label={t('hybrid.road.what')} rich={road.here.now} />
      )}
      {road.here?.cardId === cardId && road.here.why && (
        <SubLine label={t('hybrid.road.why')} rich={road.here.why} />
      )}
    </>
  );
  return (
    <View style={styles.wrap} testID="road-tab">
      {road.target && (
        <View style={styles.target} testID="road-target">
          <Text style={styles.section}>{t('hybrid.road.target')}</Text>
          <RichView rich={road.target} variant="paper" />
        </View>
      )}
      <TripMap
        road={road.road}
        mode={road.road.ready ? 'progress' : 'trip'}
        reused={road.reused}
        questionLabels={questionLabels}
        stepExtra={extra}
        testID="road-map"
      />
      {road.card && (
        <MethodCardView card={road.card} id="road" testID="road-method-card" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.md },
  target: {
    gap: theme.space.xxs,
    padding: theme.space.md,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  section: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
