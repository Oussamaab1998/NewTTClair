/**
 * The question trip (owner, 2026-10-30): the first time he opens a
 * question, we show him its map, in simple darija, and he builds nothing.
 * A short title and one sentence on how to read it, then the map
 * (TripMap, 'trip' mode: the exercise from above, what changed, what we
 * have, what is asked, the steps, the end, what comes after), its sections
 * fading in one after the other. The only act is «نبداو», full width at
 * the bottom and always in reach; the chat drawer stays under it. The same
 * map is «الطريق» afterwards.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ReusedStep } from '../../../../hybrid/board';
import type { RoadView } from '../../../../hybrid/tour/tour';
import { theme } from '../../../../theme';
import { TripMap } from './TripMap';

export interface TripScreenProps {
  road: RoadView;
  reused: Readonly<Record<string, ReusedStep>>;
  questionLabels: Readonly<Record<string, string>>;
  /** An answer is on its way (the chat): «نبداو» waits. */
  waiting: boolean;
  onStart: () => void;
}

export function TripScreen(p: TripScreenProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.root} testID="trip-screen">
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        testID="trip-body"
      >
        <View style={styles.intro}>
          <Text style={styles.title} accessibilityRole="header">
            {t('hybrid.trip.title')}
          </Text>
          <Text style={styles.sub}>{t('hybrid.trip.intro')}</Text>
        </View>
        <TripMap
          road={p.road}
          mode="trip"
          reused={p.reused}
          questionLabels={p.questionLabels}
          animate
        />
      </ScrollView>
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.primary,
            (pressed || p.waiting) && styles.primaryPressed,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: p.waiting }}
          disabled={p.waiting}
          testID="trip-start"
          onPress={p.onStart}
        >
          <Text style={styles.primaryText}>{t('hybrid.trip.start')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  bodyContent: {
    padding: theme.layout.gutter,
    gap: theme.space.lg,
    paddingBottom: theme.space.scrollEnd,
  },
  intro: { gap: theme.space.xxs },
  title: {
    ...theme.font.header,
    color: theme.color.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sub: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  footer: {
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.sm,
    borderTopWidth: theme.border.hairline,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.backgroundApp,
  },
  primary: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.space.sm,
  },
  primaryPressed: { opacity: theme.opacity.pressed },
  primaryText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    writingDirection: 'rtl',
  },
});
