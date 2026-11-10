/**
 * «الطريق»: the question's map (TripMap, src/hybrid/tour roadView) with
 * what is done and where he is: his line under each finished step (a step
 * reused from an earlier question says where we found it), the station he
 * is on ringed with what and why under it, the later ones quieter, the
 * exercise from above folded to one line. Inside a step, the components he
 * used there reopen as he left them or to explore again (no AI). At the end
 * of the question, the method card of its type. While the trip is shown,
 * the same map as the trip.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ComponentHost } from '../../../../components/ComponentHost';
import type { Experiment } from '../../../../engine/calls';
import type { ComponentUse, RoadSheet } from '../../../../hybrid/board';
import { SubLine } from '../../../../lesson/feed/method/sheetParts';
import { RichView } from '../../../../lesson/feed/RichView';
import { theme } from '../../../../theme';
import { TripMap } from '../trip/TripMap';
import { MethodCardView } from './FoundTab';

function Reopen({
  use,
  experiment,
}: {
  use: ComponentUse;
  experiment: Experiment | undefined;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const own = use.experiment ?? experiment;
  return (
    <View style={styles.component}>
      <Pressable
        style={styles.reopen}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID={`road-component-${use.id}`}
        onPress={() => setOpen(o => !o)}
      >
        <Text style={styles.reopenText}>
          {t(open ? 'hybrid.road.hide' : 'hybrid.road.reopen')}
        </Text>
      </Pressable>
      {open && (
        <ComponentHost
          spec={{ component: use.name as never, props: use.props as never }}
          defaultInstanceId={`road-${use.id}`}
          // As he left it; with no snapshot, his to explore again.
          mode={use.snapshot ? 'replay' : 'interactive'}
          {...(own && { experiment: own as Experiment })}
          {...(use.snapshot && { snapshot: use.snapshot })}
          onEvent={() => {}}
          onError={() => {}}
        />
      )}
    </View>
  );
}

export function RoadTab({
  road,
  questionLabels,
  experiment,
}: {
  road: RoadSheet;
  /** The questions' labels on the exam paper, by question id. */
  questionLabels: Readonly<Record<string, string>>;
  experiment: Experiment | undefined;
}) {
  const { t } = useTranslation();
  const others = road.components[''] ?? [];
  const extra = (cardId: string) => (
    <>
      {road.here?.cardId === cardId && road.here.now && (
        <SubLine label={t('hybrid.road.what')} rich={road.here.now} />
      )}
      {road.here?.cardId === cardId && road.here.why && (
        <SubLine label={t('hybrid.road.why')} rich={road.here.why} />
      )}
      {(road.components[cardId] ?? []).map(c => (
        <Reopen key={c.id} use={c} experiment={experiment} />
      ))}
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
      {others.length > 0 && (
        <View style={styles.others} testID="road-others">
          <Text style={styles.section}>{t('hybrid.road.others')}</Text>
          {others.map(c => (
            <Reopen key={c.id} use={c} experiment={experiment} />
          ))}
        </View>
      )}
      {road.card && (
        <MethodCardView card={road.card} id="road" testID="road-method-card" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.space.md },
  component: { gap: theme.space.xs },
  reopen: {
    alignSelf: theme.reading.startAlign,
    minHeight: theme.size.touch,
    justifyContent: 'center',
    paddingHorizontal: theme.space.md,
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
  },
  reopenText: {
    ...theme.font.small,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
  },
  target: {
    gap: theme.space.xxs,
    padding: theme.space.md,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.border,
    backgroundColor: theme.color.card,
  },
  others: {
    gap: theme.space.xs,
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
