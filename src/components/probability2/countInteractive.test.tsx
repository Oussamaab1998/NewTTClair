import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import '../../i18n';
import { Slider } from '../analysis/Slider';
import { MAX_INTERACTIVE, countInteractive } from './countInteractive';

describe('countInteractive: the 60-element rule (hard rule 10) made testable', () => {
  it('counts Pressables, whatever their role, and ignores plain Views and Text', async () => {
    await render(
      <View>
        <Text>title</Text>
        <Pressable onPress={() => undefined} accessibilityRole="button">
          <Text>a</Text>
        </Pressable>
        <Pressable onPress={() => undefined}>
          <Text>b</Text>
        </Pressable>
        <View>
          <Text>plain</Text>
        </View>
      </View>,
    );
    expect(countInteractive(screen.toJSON())).toBe(2);
  });

  it('counts a disabled Pressable too: it still takes a place on screen', async () => {
    await render(
      <View>
        <Pressable onPress={() => undefined} disabled>
          <Text>off</Text>
        </Pressable>
        <Pressable onPress={() => undefined}>
          <Text>on</Text>
        </Pressable>
      </View>,
    );
    expect(countInteractive(screen.toJSON())).toBe(2);
  });

  it('counts a stepped slider (PanResponder, role adjustable) once', async () => {
    await render(
      <Slider
        min={0}
        max={10}
        step={1}
        value={3}
        onChange={() => undefined}
        onCommit={() => undefined}
        accessibilityLabel="p"
      />,
    );
    expect(countInteractive(screen.toJSON())).toBe(1);
  });

  it('counts a text field', async () => {
    await render(
      <View>
        <TextInput accessibilityLabel="answer" />
      </View>,
    );
    expect(countInteractive(screen.toJSON())).toBe(1);
  });

  it('works on a list of roots and on null', () => {
    expect(countInteractive(null)).toBe(0);
    expect(countInteractive([])).toBe(0);
  });

  it('60 Pressables is at the limit; 61 is over it', async () => {
    const many = (n: number) => (
      <View>
        {Array.from({ length: n }, (_, i) => (
          <Pressable key={i} onPress={() => undefined} />
        ))}
      </View>
    );
    await render(many(60));
    expect(MAX_INTERACTIVE).toBe(60);
    expect(countInteractive(screen.toJSON())).toBe(60);
    await render(many(61));
    expect(countInteractive(screen.toJSON())).toBeGreaterThan(MAX_INTERACTIVE);
  });
});
