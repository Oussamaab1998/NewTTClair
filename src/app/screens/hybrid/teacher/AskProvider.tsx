/**
 * Long press to ask (approved mockup LongPress, 2026-11-18). The board wraps
 * the lesson in AskProvider; inside it every formula and every French line
 * RichView draws is long-pressable (src/lesson/feed/RichView.tsx; without
 * the provider RichView is unchanged). A long press dims the screen, lifts
 * the pressed formula or words where they are, and shows four options:
 * «شنوّة معناها؟», «كيفاش نقراها بالفرنسي؟», «علاش نستعملوها هنا؟»,
 * «نكتب سؤالي وحدي». When the pressed text holds several glossary entries
 * (a whole French sentence), they are chips to pick first. An option calls
 * onAsk; the board then opens the teacher's screen with it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { glossaryMatches } from '../../../../content/help/help';
import type { GlossaryEntry } from '../../../../content/help/schema';
import { isFrenchWords } from '../../../../ai/teacher/glossary';
import {
  AskTargetContext,
  type AskFrame,
  type AskTarget,
} from '../../../../lesson/feed/RichView';
import { MathBlock } from '../../../../lesson/math/MathBlock';
import { theme } from '../../../../theme';
import type { AskKind, AskRequest } from './types';

interface Pressed {
  kind: 'math' | 'fr';
  text: string;
  frame: AskFrame | null;
}

const OPTIONS: readonly { kind: AskKind; icon: 'q' | 'fr' | 'why' | 'pen' }[] =
  [
    { kind: 'meaning', icon: 'q' },
    { kind: 'reading', icon: 'fr' },
    { kind: 'use', icon: 'why' },
    { kind: 'own', icon: 'pen' },
  ];
/** The options' marks (shape and text, not colour alone); «Fr» comes from i18n. */
const ICON: Readonly<Record<'q' | 'why' | 'pen', string>> = {
  q: '؟',
  why: '!',
  pen: '✎',
};

/** The pressed text drawn as it is: a formula left to right, or the paper's French. */
function PressedText({
  kind,
  text,
  testID,
}: {
  kind: 'math' | 'fr';
  text: string;
  testID?: string;
}) {
  return kind === 'math' ? (
    <MathBlock
      latex={text}
      fontSize={theme.font.size.title}
      {...(testID !== undefined && { testID })}
    />
  ) : (
    <Text
      style={styles.frText}
      accessibilityLanguage="fr"
      {...(testID !== undefined && { testID })}
    >
      {text}
    </Text>
  );
}

const entryText = (e: GlossaryEntry): string => e.match[0] ?? e.id;

export function AskMenu({
  pressed,
  entries,
  onChoose,
  onDismiss,
}: {
  pressed: Pressed | null;
  /** The glossary entries the pressed text names (chips when there are several). */
  entries: readonly GlossaryEntry[];
  onChoose: (kind: AskKind, entry: GlossaryEntry | null) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<GlossaryEntry | null>(null);
  useEffect(() => setPicked(null), [pressed?.text, pressed?.kind]);
  const frame = pressed?.frame ?? null;
  const { height } = Dimensions.get('window');
  // Below the lifted text, or above it when it sits in the lower half.
  const below = frame === null || frame.y + frame.height / 2 < height / 2;
  const gap = theme.space.lg;
  const place =
    frame === null
      ? styles.cardCentre
      : below
      ? { top: frame.y + frame.height + gap }
      : { bottom: height - frame.y + gap };
  const chips = entries.length > 1;
  return (
    <Modal
      visible={pressed !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
      testID="ask-menu-modal"
    >
      <Pressable
        style={styles.scrim}
        accessibilityRole="button"
        accessibilityLabel={t('hybrid.teacher.menu.close')}
        onPress={onDismiss}
        testID="ask-menu-scrim"
      />
      {pressed && frame && (
        <View
          pointerEvents="none"
          style={[
            styles.lifted,
            {
              top: frame.y - theme.space.xs,
              ...theme.mathSide.startEdge(frame.x - theme.space.xs),
              minWidth: frame.width + 2 * theme.space.xs,
              minHeight: frame.height + 2 * theme.space.xs,
            },
          ]}
          testID="ask-lifted"
        >
          <PressedText kind={pressed.kind} text={pressed.text} />
        </View>
      )}
      {pressed && (
        <View style={[styles.card, place]} testID="ask-menu">
          <Text style={styles.title}>{t('hybrid.teacher.menu.title')}</Text>
          {!frame && (
            <View style={styles.quote}>
              <PressedText
                kind={pressed.kind}
                text={pressed.text}
                testID="ask-quote"
              />
            </View>
          )}
          {chips && (
            <View style={styles.chipsBox}>
              <Text style={styles.pick}>{t('hybrid.teacher.menu.pick')}</Text>
              <ScrollView
                horizontal
                contentContainerStyle={styles.chips}
                keyboardShouldPersistTaps="handled"
              >
                {entries.map(e => {
                  const on = picked?.id === e.id;
                  const text = entryText(e);
                  return (
                    <Pressable
                      key={e.id}
                      style={[styles.chip, on && styles.chipOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      testID={`ask-chip-${e.id}`}
                      onPress={() => setPicked(on ? null : e)}
                    >
                      <PressedText
                        kind={isFrenchWords(text) ? 'fr' : 'math'}
                        text={text}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
          {OPTIONS.map(o => (
            <Pressable
              key={o.kind}
              style={({ pressed: down }) => [
                styles.option,
                down && styles.optionDown,
              ]}
              accessibilityRole="button"
              testID={`ask-option-${o.kind}`}
              onPress={() =>
                onChoose(
                  o.kind,
                  picked ?? (entries.length === 1 ? entries[0]! : null),
                )
              }
            >
              <View style={styles.icon}>
                <Text style={o.icon === 'fr' ? styles.iconFr : styles.iconText}>
                  {o.icon === 'fr'
                    ? t('hybrid.teacher.menu.frIcon')
                    : ICON[o.icon]}
                </Text>
              </View>
              <Text style={styles.optionText}>
                {t(`hybrid.teacher.menu.${o.kind}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Modal>
  );
}

export function AskProvider({
  exerciseId,
  onAsk,
  children,
}: {
  exerciseId: string;
  onAsk: (r: AskRequest) => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [pressed, setPressed] = useState<Pressed | null>(null);
  const label = t('hybrid.teacher.menu.action');
  // One stable value: every RichView of the lesson reads it.
  const target = useMemo<AskTarget>(
    () => ({
      label,
      onPress: p => {
        setPressed({ kind: p.kind, text: p.text, frame: null });
        p.measure(frame =>
          setPressed(cur =>
            cur && cur.kind === p.kind && cur.text === p.text
              ? { ...cur, frame }
              : cur,
          ),
        );
      },
    }),
    [label],
  );
  const text = pressed?.text ?? null;
  const entries = useMemo(
    () => (text === null ? [] : glossaryMatches(exerciseId, text)),
    [exerciseId, text],
  );
  const choose = (kind: AskKind, entry: GlossaryEntry | null) => {
    if (!pressed) {
      return;
    }
    setPressed(null);
    // A chip he picked in a sentence: the question is about it.
    const chip = entry && entries.length > 1 ? entryText(entry) : null;
    onAsk({
      kind,
      pressed: chip
        ? { kind: isFrenchWords(chip) ? 'fr' : 'math', text: chip }
        : { kind: pressed.kind, text: pressed.text },
      entryId: entry?.id ?? null,
    });
  };
  return (
    <AskTargetContext.Provider value={target}>
      {children}
      <AskMenu
        pressed={pressed}
        entries={entries}
        onChoose={choose}
        onDismiss={() => setPressed(null)}
      />
    </AskTargetContext.Provider>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.color.overlayScrim,
  },
  lifted: {
    position: 'absolute',
    backgroundColor: theme.color.surfaceSelected,
    borderColor: theme.color.ink,
    borderWidth: theme.border.thick,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.space.xs,
  },
  card: {
    position: 'absolute',
    ...theme.mathSide.startEdge(theme.layout.gutter),
    ...theme.mathSide.endEdge(theme.layout.gutter),
    backgroundColor: theme.color.surfaceCard,
    borderRadius: theme.radius.sheet,
    overflow: 'hidden',
  },
  cardCentre: { top: '25%' },
  title: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingHorizontal: theme.space.xxl,
    paddingVertical: theme.space.lg,
    borderBottomWidth: theme.border.thin,
    borderBottomColor: theme.color.border,
  },
  quote: {
    alignItems: 'center',
    paddingVertical: theme.space.sm,
    backgroundColor: theme.color.highlighterSoft,
  },
  chipsBox: {
    paddingHorizontal: theme.space.xxl,
    paddingVertical: theme.space.sm,
    gap: theme.space.xs,
    borderBottomWidth: theme.border.thin,
    borderBottomColor: theme.color.border,
  },
  pick: {
    ...theme.font.small,
    color: theme.color.textPrimary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  chips: { flexDirection: theme.mathSide.row, gap: theme.space.xs },
  chip: {
    minHeight: theme.size.askChipMinHeight,
    justifyContent: 'center',
    paddingHorizontal: theme.space.sm,
    borderRadius: theme.radius.tag,
    borderWidth: theme.border.thin,
    borderColor: theme.color.borderControl,
    backgroundColor: theme.color.paper,
  },
  chipOn: {
    backgroundColor: theme.color.surfaceSelected,
    borderColor: theme.color.ink,
    borderWidth: theme.border.thick,
  },
  frText: {
    ...theme.font.paper,
    color: theme.color.textPrimary,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  option: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.md,
    minHeight: theme.size.touch + theme.space.xs,
    paddingHorizontal: theme.space.xxl,
    borderTopWidth: theme.border.thin,
    borderTopColor: theme.color.border,
  },
  optionDown: { backgroundColor: theme.color.highlighterSoft },
  icon: {
    width: theme.size.toneIcon + theme.space.xs,
    height: theme.size.toneIcon + theme.space.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.body,
    color: theme.color.pen,
  },
  iconFr: {
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.small,
    color: theme.color.pen,
  },
  optionText: {
    ...theme.font.body,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
    textAlign: 'right',
    flexShrink: 1,
  },
});
