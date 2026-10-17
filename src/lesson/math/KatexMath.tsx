import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { renderKatexDocument } from './katexHtml';
import { nowMs } from '../../telemetry/clock';
import { theme } from '../../theme';

interface KatexMathProps {
  latex: string;
  fontSize: number;
  color: string;
  onReady: (ms: number) => void;
  onError: (error: unknown) => void;
}

/** KaTeX in a WebView (spike for docs/DECISIONS.md D1). */
export function KatexMath({
  latex,
  fontSize,
  color,
  onReady,
  onError,
}: KatexMathProps) {
  const start = useRef(nowMs());
  const [height, setHeight] = useState(
    fontSize * theme.katex.initialHeightRatio,
  );

  const doc = useMemo((): { html: string } | { error: unknown } => {
    try {
      return { html: renderKatexDocument(latex, { fontSize, color }) };
    } catch (error) {
      return { error };
    }
  }, [latex, fontSize, color]);

  useEffect(() => {
    if ('error' in doc) {
      onError(doc.error);
    }
    // Report once per document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  if ('error' in doc) {
    return null;
  }

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as {
        type?: string;
        height?: number;
      };
      if (msg.type === 'ready' && typeof msg.height === 'number') {
        setHeight(msg.height);
        onReady(nowMs() - start.current);
      }
    } catch (error) {
      onError(error);
    }
  };

  return (
    <WebView
      source={{ html: doc.html }}
      originWhitelist={['about:blank']}
      onShouldStartLoadWithRequest={req => req.url === 'about:blank'}
      onMessage={onMessage}
      scrollEnabled={false}
      javaScriptEnabled
      allowFileAccess={false}
      setSupportMultipleWindows={false}
      // Without a stretched container the WebView gets zero width inside a
      // centered parent and renders blank (seen on iOS).
      containerStyle={styles.container}
      style={[styles.webview, { height }]}
    />
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
  webview: { backgroundColor: 'transparent' },
});
