/**
 * The small drawer for free text and help, kept out of the main view: a
 * bar with how many messages it holds; open, the thread of his words and
 * the answers, a text field and send. The step card stays where it is.
 * While an answer is on its way, send is off (dimmed); after his own send,
 * it shows a spinner.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { theme } from '../../../theme';
import { ExchangeView } from './StepCard';
import type { Exchange } from './useHybridSession';

const MAX_TEXT = 500;
const OPEN_MARK = '▴';
const CLOSE_MARK = '▾';
/** Send: an arrow toward the reading direction (the label is for screen readers). */
const SEND_MARK = '←';

export function ChatDrawer({
  exchanges,
  disabled,
  onSend,
}: {
  exchanges: readonly Exchange[];
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  // His send is the act being answered (cleared once nothing waits).
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!disabled && sent) {
      setSent(false);
    }
  }, [disabled, sent]);
  const busy = disabled && sent;
  const scroll = useRef<ScrollViewInstance>(null);
  const send = () => {
    const v = text.trim();
    if (v === '' || disabled) {
      return;
    }
    setText('');
    setSent(true);
    onSend(v);
  };
  return (
    <View style={styles.drawer} testID="chat-drawer">
      <Pressable
        style={styles.bar}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID={open ? 'chat-close' : 'chat-open'}
        onPress={() => setOpen(o => !o)}
      >
        <Text style={styles.barText}>{t('hybrid.chat.open')}</Text>
        {exchanges.length > 0 && (
          <Text style={styles.count} testID="chat-count">
            {exchanges.length}
          </Text>
        )}
        <Text style={styles.barText}>{open ? CLOSE_MARK : OPEN_MARK}</Text>
      </Pressable>
      {open && (
        <View style={styles.body}>
          <ScrollView
            ref={scroll}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
            onContentSizeChange={() =>
              scroll.current?.scrollToEnd({ animated: false })
            }
            keyboardShouldPersistTaps="handled"
          >
            {exchanges.length === 0 ? (
              <Text style={styles.empty}>{t('hybrid.chat.empty')}</Text>
            ) : (
              exchanges.map(x => <ExchangeView key={x.id} x={x} live={null} />)
            )}
          </ScrollView>
          <View style={styles.row}>
            <TextInput
              style={styles.field}
              value={text}
              onChangeText={setText}
              placeholder={t('hybrid.chat.placeholder')}
              placeholderTextColor={theme.color.textSecondary}
              maxLength={MAX_TEXT}
              multiline
              testID="chat-input"
            />
            <Pressable
              style={[styles.send, disabled && styles.sendOff]}
              accessibilityRole="button"
              accessibilityLabel={t('hybrid.chat.send')}
              accessibilityState={{ disabled, busy }}
              disabled={disabled}
              testID="chat-send"
              onPress={send}
            >
              {busy ? (
                <ActivityIndicator
                  size="small"
                  color={theme.color.textOnAccent}
                  testID="chat-send-busy"
                />
              ) : (
                <Text style={styles.sendText}>{SEND_MARK}</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    borderTopWidth: theme.border.line,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surfaceCard,
  },
  bar: {
    flexDirection: theme.reading.row,
    alignItems: 'center',
    gap: theme.space.sm,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.layout.gutter,
  },
  barText: {
    ...theme.font.body,
    color: theme.color.textPrimary,
    writingDirection: 'rtl',
  },
  count: {
    ...theme.font.small,
    fontFamily: theme.font.family.ui.bold,
    color: theme.color.textOnAccent,
    backgroundColor: theme.color.ink,
    borderRadius: theme.radius.tag,
    overflow: 'hidden',
    paddingHorizontal: theme.space.sm,
  },
  body: {
    paddingHorizontal: theme.layout.gutter,
    paddingBottom: theme.space.sm,
    gap: theme.space.sm,
  },
  thread: { maxHeight: theme.size.eventPanelMaxHeight },
  threadContent: { gap: theme.space.sm },
  empty: {
    ...theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  row: {
    flexDirection: theme.reading.row,
    alignItems: 'flex-end',
    gap: theme.space.sm,
  },
  field: {
    flex: 1,
    minHeight: theme.size.touch,
    borderWidth: theme.border.line,
    borderColor: theme.color.borderControl,
    borderRadius: theme.radius.button,
    paddingHorizontal: theme.space.md,
    ...theme.font.body,
    color: theme.color.textPrimary,
    textAlign: 'right',
  },
  send: {
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.button,
    backgroundColor: theme.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { backgroundColor: theme.color.inkDisabled },
  sendText: { ...theme.font.header, color: theme.color.textOnAccent },
});
