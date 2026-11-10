/**
 * The strip under the header: the question's map as a breadcrumb. Its
 * stations in reading order (the steps, then the end as a flag), each
 * done ✓, now ● (ringed) or later ○, joined by a thin line; under them
 * «توّا» and the title of the station he is on. One tap opens «الطريق»,
 * where the whole map is. Hidden while the trip is shown.
 */
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Strip } from '../../../../hybrid/board';
import type { RoadStatus } from '../../../../hybrid/tour/tour';
import { RichView } from '../../../../lesson/feed/RichView';
import { theme } from '../../../../theme';
import { CheckIcon, FlagIcon } from './icons';
import { ROAD_WORD } from './TripMap';

const ICON = theme.size.paperDot;

function Marker({
  status,
  label,
  testID,
  children,
}: {
  status: RoadStatus;
  label: string;
  testID: string;
  children?: React.ReactNode;
}) {
  return (
    <View
      style={[styles.marker, status === 'now' && styles.markerNow]}
      accessible
      accessibilityLabel={label}
      testID={testID}
    >
      <View
        style={[
          styles.dot,
          status === 'done' && styles.dotDone,
          status === 'now' && styles.dotNow,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export const TripStrip = memo(function TripStripImpl({
  strip,
  onOpen,
}: {
  strip: Strip;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const now = strip.now;
  return (
    <Pressable
      style={styles.strip}
      accessibilityRole="button"
      accessibilityLabel={t('hybrid.strip.open')}
      testID="hybrid-map"
      onPress={onOpen}
    >
      <View style={styles.crumbs}>
        {strip.steps.map(x => (
          <React.Fragment key={x.key}>
            <Marker
              status={x.status}
              label={t(ROAD_WORD[x.status])}
              testID={`hybrid-map-${x.key}-${x.status}`}
            >
              {x.status === 'done' && (
                <CheckIcon size={ICON} color={theme.color.textOnAccent} />
              )}
            </Marker>
            <View
              style={[styles.join, x.status === 'done' && styles.joinDone]}
            />
          </React.Fragment>
        ))}
        <Marker
          status={strip.end}
          label={`${t('hybrid.trip.finish')} ${t(ROAD_WORD[strip.end])}`}
          testID={`hybrid-map-end-${strip.end}`}
        >
          <FlagIcon
            size={ICON}
            filled={strip.end !== 'later'}
            color={
              strip.end === 'later'
                ? theme.color.inkMuted
                : theme.color.textOnAccent
            }
          />
        </Marker>
      </View>
      {now && (
        <View style={styles.nowLine} testID="hybrid-map-now">
          <Text style={styles.nowLabel}>{t('hybrid.strip.now')}</Text>
          <View style={styles.nowText}>
            {now.kind === 'step' ? (
              <RichView
                rich={now.title}
                fontSize={theme.font.size.small}
                fontFamily={theme.font.family.ui.bold}
                numberOfLines={1}
              />
            ) : (
              <Text style={styles.nowPlain} numberOfLines={1}>
                {t(`hybrid.kind.${now.kind}`)}
              </Text>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: theme.layout.gutter,
    paddingVertical: theme.space.xs,
    gap: theme.space.xxs,
    backgroundColor: theme.color.surfaceMuted,
    borderBottomWidth: theme.border.hairline,
    borderBottomColor: theme.color.border,
  },
  crumbs: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
  },
  marker: {
    padding: theme.space.xxxs,
    borderRadius: theme.size.toneIcon,
    borderWidth: theme.border.active,
    borderColor: theme.color.surfaceMuted,
  },
  markerNow: { borderColor: theme.color.pen },
  dot: {
    width: theme.size.checkBadge,
    height: theme.size.checkBadge,
    borderRadius: theme.size.checkBadge / 2,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    borderColor: theme.color.correct.ink,
    backgroundColor: theme.color.correct.ink,
  },
  dotNow: {
    borderColor: theme.color.pen,
    backgroundColor: theme.color.pen,
  },
  join: {
    flex: 1,
    height: theme.border.line,
    backgroundColor: theme.color.borderControl,
  },
  joinDone: { backgroundColor: theme.color.correct.ink },
  nowLine: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xs,
  },
  nowLabel: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    writingDirection: 'rtl',
  },
  nowText: { flex: 1 },
  nowPlain: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
