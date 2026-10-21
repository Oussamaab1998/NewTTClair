import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { probe } from '../../perf/probe';
import { ActionButton, Panel } from '../probability/ui';
import { theme } from '../../theme';

interface Props {
  /** Component name (perf probe: "<name> collapsed" height). */
  name: string;
  testID: string;
  /** testIDs `<prefix>-expand` / `<prefix>-collapse`. */
  prefix: string;
  /** Collapsed body (COMPONENTS_CONTRACT.md rule 5: 180-260 pt); gets the expand button. */
  renderCompact: (expandButton: React.ReactNode) => React.ReactNode;
  /** Full-screen body (same component state). */
  full: React.ReactNode;
  onToggle: (expanded: boolean) => void;
}

/**
 * Collapsed in the feed, tap-to-expand to a full-screen view. While expanded,
 * the feed keeps a placeholder of the same height (no layout jump, one copy
 * of each readout on screen).
 */
export function Expandable(p: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const toggle = (next: boolean) => {
    setOpen(next);
    p.onToggle(next);
  };
  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (!open) {
      setHeight(h);
      probe.layout(`${p.name} collapsed`, h);
    }
  };
  // Icon-sized (44 pt touch) so it shares a line with the first readout.
  const expand = (
    <Pressable
      onPress={() => toggle(true)}
      accessibilityRole="button"
      accessibilityLabel={t('analysis.expand')}
      testID={`${p.prefix}-expand`}
      style={({ pressed }) => [styles.icon, pressed && styles.pressed]}
    >
      <Text style={styles.iconText}>{t('analysis.expandIcon')}</Text>
    </Pressable>
  );
  return (
    <>
      <View onLayout={onLayout}>
        <Panel testID={p.testID}>
          {open ? (
            <View style={height !== null ? { height } : undefined} />
          ) : (
            p.renderCompact(expand)
          )}
        </Panel>
      </View>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => toggle(false)}
      >
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <ActionButton
            label={t('analysis.collapse')}
            onPress={() => toggle(false)}
            testID={`${p.prefix}-collapse`}
          />
          {open && p.full}
        </ScrollView>
      </Modal>
    </>
  );
}

/**
 * Collapsed layout: plot and readouts side by side (slider below, given by
 * the caller). The expand icon shares the first readout's line.
 */
export function CompactRow({
  plot,
  head,
  side,
  expand,
}: {
  plot: React.ReactNode;
  head: React.ReactNode;
  side: React.ReactNode;
  expand: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.plot}>{plot}</View>
      <View style={styles.side}>
        <View style={styles.head}>
          <View style={styles.headText}>{head}</View>
          {expand}
        </View>
        {side}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: theme.color.surfaceCard },
  content: { padding: theme.space.lg, gap: theme.space.sm },
  row: { flexDirection: 'row', direction: 'ltr', gap: theme.space.xs },
  plot: { flex: theme.plot.compactPlotFlex },
  side: { flex: theme.plot.compactReadoutFlex, gap: theme.space.xxs },
  head: { flexDirection: 'row', alignItems: 'center' },
  headText: { flex: 1 },
  icon: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: theme.opacity.pressed },
  iconText: {
    fontSize: theme.font.size.title,
    color: theme.color.actionPrimary,
  },
});
