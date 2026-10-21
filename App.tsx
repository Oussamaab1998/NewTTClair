import './src/i18n';

import React, { useEffect, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AnalysisDemoScreen } from './src/app/screens/AnalysisDemoScreen';
import { BidiTestScreen } from './src/app/screens/BidiTestScreen';
import { LessonScreen } from './src/app/screens/LessonScreen';
import { LessonUiDemoScreen } from './src/app/screens/LessonUiDemoScreen';
import {
  PROBABILITY_DEMO_COMPONENTS,
  ProbabilityDemoScreen,
} from './src/app/screens/ProbabilityDemoScreen';
import { setDevTools, useDevTools } from './src/app/devFlags';
import type * as DevOnly from './src/app/dev';
import { theme } from './src/theme';

type Tab = 'lesson' | 'demo' | 'proba' | 'analyse' | 'bidi';
const TABS: readonly Tab[] = ['lesson', 'demo', 'proba', 'analyse', 'bidi'];

/** Debug builds only; `__DEV__` is false in release, so Metro drops the require. */
const devOnly: typeof DevOnly | null = __DEV__
  ? (require('./src/app/dev') as typeof DevOnly)
  : null;

/** `-devTab` / `-devComponent` launch arguments (screenshots without taps). */
function launchTab(): Tab | null {
  const tab = devOnly?.devTabAtLaunch();
  if (tab && (TABS as readonly string[]).includes(tab)) {
    return tab as Tab;
  }
  const component = devOnly?.devComponentAtLaunch()?.split('#')[0];
  if (!component) {
    return null;
  }
  return PROBABILITY_DEMO_COMPONENTS.includes(component) ? 'proba' : 'analyse';
}

function Root() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [atLaunch] = useState(launchTab);
  const [tab, setTab] = useState<Tab>(atLaunch ?? 'lesson');
  useEffect(() => {
    if (atLaunch) {
      setDevTools(true);
    }
  }, [atLaunch]);
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
        {shown === 'analyse' && <AnalysisDemoScreen />}
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
