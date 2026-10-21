import React from 'react';
import { Pressable } from 'react-native';

import { styles as ui } from '../probability/ui';

/** A selectable chip (selection shown by border width, not color alone). */
export function ChoiceChip({
  selected,
  disabled,
  onPress,
  children,
  accessibilityLabel,
  testID,
}: {
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      {...(accessibilityLabel !== undefined && { accessibilityLabel })}
      testID={testID}
      style={({ pressed }) => [
        ui.chip,
        selected && ui.selected,
        pressed && ui.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}
