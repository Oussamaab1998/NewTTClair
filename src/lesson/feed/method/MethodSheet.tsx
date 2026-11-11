/**
 * The route of the question, as a sheet over the dimmed lesson (addendum E,
 * 21): every step with what it does, why, and what comes next. Rows are not
 * tappable. Done steps carry a check, the current one is a highlighter row
 * with an ink border: no other status, never a mistake. Findings and the
 * paper skeleton come later; this is the roadmap. The scrim is a sibling
 * behind the sheet, never its parent: a pressable around the sheet took the
 * touch and its body did not scroll (owner, 2026-11-10).
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

import type { FindingResult, SkeletonRow } from '../../../method/findings';
import type { Roadmap } from '../../../method/roadmap';
import { theme, type PaperStyle } from '../../../theme';
import { PaperBackground } from '../../paper/PaperBackground';
import { Finding, RouteRow, SkeletonLine } from './sheetParts';

const CLOSE_MARK = '×';

export type MethodSheetCloseVia = 'close' | 'scrim' | 'back_gesture' | 'return';

interface Props {
  visible: boolean;
  roadmap: Roadmap;
  /** What he found, from his own accepted lines. */
  found?: readonly FindingResult[];
  /** The exam lines with blanks filled from his accepted lines only. */
  skeleton?: readonly SkeletonRow[];
  onClose: (via: MethodSheetCloseVia) => void;
  paperStyle?: PaperStyle;
}

export function MethodSheet({
  visible,
  roadmap,
  found = [],
  skeleton = [],
  onClose,
  paperStyle = theme.layout.paperStyle,
}: Props) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => onClose('back_gesture')}
      testID="method-modal"
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => onClose('scrim')}
          accessible={false}
          testID="method-sheet-scrim"
        />
        <View style={styles.sheet} testID="method-sheet">
          <PaperBackground style={paperStyle} />
          <View style={styles.handle} />
          <View style={styles.head}>
            <Text style={styles.title}>{t('method.sheet.title')}</Text>
            <Pressable
              onPress={() => onClose('close')}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t('method.sheet.close')}
              testID="method-sheet-close"
            >
              <Text style={styles.closeMark}>{CLOSE_MARK}</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            testID="method-sheet-scroll"
          >
            <Text style={styles.section}>{t('method.sheet.roadmap')}</Text>
            {roadmap.entries.map(e => (
              <RouteRow key={e.id} row={e} />
            ))}
            {found.length > 0 && (
              <Text style={styles.section}>{t('method.sheet.found')}</Text>
            )}
            {found.map(f => (
              <Finding key={f.id} finding={f} />
            ))}
            {skeleton.length > 0 && (
              <>
                <Text style={styles.section}>{t('method.sheet.paper')}</Text>
                <View style={styles.paperSheet} testID="paper-skeleton">
                  {skeleton.map(r => (
                    <SkeletonLine key={r.id} row={r} />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
          <Pressable
            onPress={() => onClose('return')}
            style={styles.primary}
            accessibilityRole="button"
            testID="method-sheet-return"
          >
            <Text style={styles.primaryText}>{t('method.sheet.back')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
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
    gap: theme.space.md,
    marginBottom: theme.space.md,
  },
  title: {
    flex: 1,
    ...theme.font.header,
    color: theme.color.ink,
    writingDirection: 'rtl',
  },
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
  /** Grows with its content, shrinks to the sheet's height and scrolls. */
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { gap: theme.space.sm, paddingBottom: theme.space.lg },
  section: {
    color: theme.color.textSecondary,
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.small,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: theme.space.sm,
  },
  paperSheet: {
    padding: theme.space.md,
    borderRadius: theme.radius.card,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderPaper,
    backgroundColor: theme.color.card,
    gap: theme.space.xs,
  },
  primary: {
    minHeight: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: theme.color.textOnAccent,
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
  },
});
