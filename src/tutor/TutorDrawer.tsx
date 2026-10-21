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

import { AskAnswer, StudentBubble } from '../lesson/feed/Bubbles';
import { BlockActions } from '../lesson/feed/BlockActions';
import type { ReportTarget } from '../lesson/feed/reportTarget';
import { RichView } from '../lesson/feed/RichView';
import { MathBlock } from '../lesson/math/MathBlock';
import { theme } from '../theme';
import type { TutorAnswer } from './tutor';

const CAUTION_MARK = '⚠';
const WAIT_MARK = '…';

export type DrawerState =
  | { question: string; status: 'loading' }
  | { question: string; status: 'done'; answer: TutorAnswer }
  | null;

export type DrawerChoice = 'understood' | 'still_unclear' | 'back';

interface TutorDrawerProps {
  state: DrawerState;
  /** Hidden (not closed) while a report sheet is open on top of it. */
  hidden: boolean;
  onChoose: (choice: DrawerChoice) => void;
  onReport: (target: ReportTarget) => void;
  onMenu: (target: ReportTarget) => void;
}

/**
 * Tutor drawer (Phase 4 Step 6): the student's question, then a loading line
 * (no provisional answer), then verified content, checked AI blocks with
 * their label and Report button, or a neutral "saved" line. Ends with
 * choices: the student acts on every screen (CLAUDE.md rule 7).
 */
export function TutorDrawer({
  state,
  hidden,
  onChoose,
  onReport,
  onMenu,
}: TutorDrawerProps) {
  const { t } = useTranslation();
  const answer = state?.status === 'done' ? state.answer : null;
  const loadingLine = `${WAIT_MARK} ${t('tutor.loading')}`;
  const caution = `${CAUTION_MARK} ${t('tutor.maybeWrong')}`;
  const choices: DrawerChoice[] =
    answer?.source === 'saved' || answer === null
      ? ['back']
      : ['understood', 'still_unclear', 'back'];
  const label = (c: DrawerChoice) =>
    c === 'still_unclear' ? t('tutor.stillUnclear') : t(`tutor.${c}`);

  return (
    <Modal
      visible={state !== null && !hidden}
      transparent
      animationType="slide"
      onRequestClose={() => onChoose('back')}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="tutor-drawer">
          <Text style={styles.title}>{t('tutor.title')}</Text>
          <ScrollView style={styles.body}>
            {state && (
              <StudentBubble content={{ kind: 'text', text: state.question }} />
            )}
            {state?.status === 'loading' && (
              <Text style={styles.muted} testID="tutor-loading">
                {loadingLine}
              </Text>
            )}
            {answer?.source === 'verified' && (
              <View testID="tutor-verified">
                <AskAnswer parts={answer.parts} />
                <Text style={styles.note}>
                  {t('lesson.trust.lesson_unreviewed')}
                </Text>
              </View>
            )}
            {answer?.source === 'ai' &&
              answer.blocks.map((b, i) => {
                const target: ReportTarget = {
                  blockId: `ai:${answer.requestId}:${i}`,
                  source: 'ai',
                  trust: 'ai_generated',
                  prominent: true,
                  itemKey: `tutor-${i}`,
                  llmRequestId: answer.requestId,
                };
                return (
                  <BlockActions
                    key={target.blockId}
                    target={target}
                    // AI blocks: the visible Report button and trust line.
                    path={null}
                    label=""
                    onMenu={onMenu}
                    onReport={onReport}
                  >
                    {b.type === 'text' ? (
                      <RichView rich={b.text} />
                    ) : (
                      <MathBlock latex={b.latex} />
                    )}
                    {b.check === 'unverified' && (
                      <Text
                        style={styles.caution}
                        testID={`tutor-caution-${i}`}
                      >
                        {caution}
                      </Text>
                    )}
                  </BlockActions>
                );
              })}
            {answer?.source === 'saved' && (
              <Text style={styles.muted} testID="tutor-saved">
                {t('tutor.saved')}
              </Text>
            )}
          </ScrollView>
          {(answer !== null || state?.status === 'loading') && (
            <View style={styles.choices}>
              {choices.map(c => (
                <Pressable
                  key={c}
                  onPress={() => onChoose(c)}
                  style={styles.choice}
                  accessibilityRole="button"
                  testID={`tutor-${c}`}
                >
                  <Text style={styles.choiceText}>{label(c)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.color.overlayScrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: theme.color.backgroundApp,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    padding: theme.space.lg,
    paddingBottom: theme.space.sheetBottom,
  },
  title: {
    fontSize: theme.font.size.body,
    fontWeight: theme.font.weight.semibold,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: theme.color.textPrimary,
    marginBottom: theme.space.sm,
  },
  body: { flexGrow: 0 },
  muted: {
    fontSize: theme.font.size.callout,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginVertical: theme.space.sm,
  },
  note: {
    fontSize: theme.font.size.tiny,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  caution: {
    fontSize: theme.font.size.caption,
    color: theme.feedback.warning.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: theme.space.xxs,
  },
  choices: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.space.sm,
    marginTop: theme.space.sm,
  },
  choice: {
    minHeight: theme.size.touch,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.pill,
    borderWidth: theme.border.thin,
    borderColor: theme.color.actionPrimary,
    justifyContent: 'center',
  },
  choiceText: {
    fontSize: theme.font.size.callout,
    color: theme.color.actionPrimary,
    writingDirection: 'rtl',
  },
});
