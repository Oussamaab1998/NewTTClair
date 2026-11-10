/**
 * The board's sheet over the dimmed lesson: the three segments at the top
 * (switch without closing), the sheet shown, and «نرجعو للسؤال». Only the
 * shown sheet is built (its data is computed when it opens).
 */
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { PaperBackground } from '../../../../lesson/paper/PaperBackground';
import { theme } from '../../../../theme';
import { TabBar, type BoardTab } from './TabBar';

const CLOSE_MARK = '×';
/** Swallows taps inside the sheet (they never reach the scrim). */
const swallow = () => undefined;

export function BoardSheet({
  tab,
  onTab,
  onClose,
  children,
}: {
  /** The sheet shown; null: closed. */
  tab: BoardTab | null;
  onTab: (tab: BoardTab) => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={tab !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID="board-modal"
    >
      <Pressable style={styles.scrim} onPress={onClose} testID="board-scrim">
        <Pressable
          style={styles.sheet}
          onPress={swallow}
          accessible={false}
          testID="board-sheet"
        >
          <PaperBackground style={theme.layout.paperStyle} />
          <View style={styles.handle} />
          <View style={styles.head}>
            <View style={styles.tabs}>
              <TabBar selected={tab} onSelect={onTab} testID="sheet-tabs" />
            </View>
            <Pressable
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t('hybrid.sheet.close')}
              testID="board-close"
            >
              <Text style={styles.closeMark}>{CLOSE_MARK}</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            testID={tab ? `board-${tab}` : undefined}
          >
            {children}
          </ScrollView>
          <Pressable
            onPress={onClose}
            style={styles.primary}
            accessibilityRole="button"
            testID="board-return"
          >
            <Text style={styles.primaryText}>{t('hybrid.sheet.back')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: theme.color.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: theme.color.paper,
    borderTopLeftRadius: theme.radius.sheetTop,
    borderTopRightRadius: theme.radius.sheetTop,
    overflow: 'hidden',
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.space.sheetBottom,
  },
  handle: {
    alignSelf: 'center',
    width: theme.size.touch,
    height: theme.space.xxs,
    borderRadius: theme.space.xxs,
    backgroundColor: theme.color.border,
    marginVertical: theme.space.sm,
  },
  head: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    marginBottom: theme.space.md,
  },
  tabs: { flex: 1 },
  close: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.size.touch / 2,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeMark: { ...theme.font.header, color: theme.color.ink },
  body: { flexGrow: 0 },
  bodyContent: { gap: theme.space.md, paddingBottom: theme.space.lg },
  primary: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.space.sm,
  },
  primaryText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    writingDirection: 'rtl',
  },
});
