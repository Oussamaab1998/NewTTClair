import './src/i18n';

import React, { useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BidiTestScreen } from './src/app/screens/BidiTestScreen';
import { LessonScreen } from './src/app/screens/LessonScreen';
import { LessonUiDemoScreen } from './src/app/screens/LessonUiDemoScreen';
import { ProbabilityDemoScreen } from './src/app/screens/ProbabilityDemoScreen';
import { useDevTools } from './src/app/devFlags';
import { theme } from './src/theme';

type Tab = 'lesson' | 'demo' | 'proba' | 'bidi';
const TABS: readonly Tab[] = ['lesson', 'demo', 'proba', 'bidi'];

function Root() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('lesson');
  // Dev tabs only behind the dev flag (long-press on the lesson title).
  const devTools = useDevTools();
  const shown: Tab = devTools ? tab : 'lesson';
  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {/* BidiTestScreen handles its own top inset. */}
      <View
        style={[styles.screen, shown !== 'bidi' && { paddingTop: insets.top }]}
      >
        {shown === 'lesson' && <LessonScreen />}
        {shown === 'demo' && <LessonUiDemoScreen />}
        {shown === 'proba' && <ProbabilityDemoScreen />}
        {shown === 'bidi' && <BidiTestScreen />}
      </View>
      {devTools && (
        <View style={styles.tabs}>
          {TABS.map(name => (
            <Pressable
              key={name}
              onPress={() => setTab(name)}
              style={[styles.tab, tab === name && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === name }}
              testID={`tab-${name}`}
            >
              <Text style={styles.tabText}>{t(`app.tab.${name}`)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <Root />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.backgroundRoot },
  screen: { flex: 1 },
  tabs: {
    flexDirection: 'row-reverse',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.borderDefault,
  },
  tab: {
    flex: 1,
    minHeight: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderTopWidth: theme.border.thick,
    borderTopColor: theme.color.actionPrimary,
  },
  tabText: { fontSize: theme.font.size.small },
});

export default App;
