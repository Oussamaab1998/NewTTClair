/**
 * The three sheets of the board as three segments, in reading order (the
 * first at the right): «التمرين», «الطريق», «اللي لقيناه». Under the strip
 * each opens its sheet; inside the sheet the one shown is selected (bold
 * and a bar under it: not colour alone). A segment can flash for a moment
 * (his road went into «الطريق» at «نبداو»): selected look and a dot.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '../../../../theme';

export const BOARD_TABS = ['exercise', 'road', 'found'] as const;
export type BoardTab = (typeof BOARD_TABS)[number];

export function TabBar({
  selected,
  onSelect,
  flash = null,
  testID = 'board-tabs',
}: {
  /** The sheet shown, null under the strip (the segments are openers). */
  selected: BoardTab | null;
  onSelect: (tab: BoardTab) => void;
  /** A segment to draw the eye to for a moment. */
  flash?: BoardTab | null;
  testID?: string;
}) {
  const { t } = useTranslation();
  return (
    <View
      style={styles.bar}
      accessibilityRole="tablist"
      accessibilityLabel={t('hybrid.tabs.label')}
      testID={testID}
    >
      {BOARD_TABS.map(tab => {
        const on = tab === selected || tab === flash;
        return (
          <Pressable
            key={tab}
            style={[styles.tab, on && styles.tabOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            testID={`${testID}-${tab}`}
            onPress={() => onSelect(tab)}
          >
            <View style={styles.label}>
              {tab === flash && (
                <Text
                  style={[styles.text, styles.textOn]}
                  accessibilityLabel={t('hybrid.road.saved')}
                  testID={`${testID}-${tab}-flash`}
                >
                  {FLASH_MARK}
                </Text>
              )}
              <Text
                style={[styles.text, on && styles.textOn]}
                numberOfLines={1}
              >
                {t(`hybrid.tabs.${tab}`)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const FLASH_MARK = '●';

const styles = StyleSheet.create({
  bar: {
    flexDirection: theme.reading.row,
    gap: theme.space.xs,
  },
  tab: {
    flex: 1,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.chip,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    paddingHorizontal: theme.space.xs,
  },
  tabOn: {
    borderColor: theme.color.ink,
    borderBottomWidth: theme.border.focus,
    backgroundColor: theme.color.highlighterSoft,
  },
  text: {
    ...theme.font.small,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
  },
  textOn: { fontFamily: theme.font.family.ui.bold },
  label: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.xxs,
  },
});
