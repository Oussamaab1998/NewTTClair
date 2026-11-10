/**
 * Small line icons of the question map (react-native-svg, 24-unit grid):
 * what we have (a box), what is asked (a target), the end (a flag), a done
 * station (a check), a station to come (a dot), what changed (two arrows).
 * Decorative: the words next to them carry the meaning (never an icon or a
 * colour alone).
 */
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { theme } from '../../../../theme';

export interface IconProps {
  size?: number;
  color?: string;
  /** Filled shape (a reached flag, the dot of the station now). */
  filled?: boolean;
}

const VIEW = '0 0 24 24';
const STROKE = theme.border.thick;

function Frame({
  size = theme.font.size.title,
  children,
}: {
  size?: number | undefined;
  children: React.ReactNode;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={VIEW}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </Svg>
  );
}

/** «عندنا»: an open box. */
export function BoxIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Path
        d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z M3 7.5 12 12l9-4.5 M12 12v9"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
    </Frame>
  );
}

/** «المطلوب»: a target. */
export function TargetIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
      />
      <Circle
        cx="12"
        cy="12"
        r="5"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
      />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
    </Frame>
  );
}

/** The end of the map: a flag (filled once he reached it). */
export function FlagIcon({
  size,
  color = theme.color.ink,
  filled = false,
}: IconProps) {
  return (
    <Frame size={size}>
      <Path
        d="M6 21V3.5 M6 4h11l-2.5 4.25L17 12.5H6"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Frame>
  );
}

/** A done station: a check. */
export function CheckIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke={color}
        strokeWidth={STROKE * 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  );
}

/** A station: a dot (filled for the one he is on). */
export function DotIcon({
  size,
  color = theme.color.ink,
  filled = true,
}: IconProps) {
  return (
    <Frame size={size}>
      <Circle
        cx="12"
        cy="12"
        r="5"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={STROKE}
      />
    </Frame>
  );
}

/** What changed since the question before: two arrows, one each way. */
export function ChangeIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Path
        d="M4 8h15 M15.5 4.5 19 8l-3.5 3.5 M20 16H5 M8.5 12.5 5 16l3.5 3.5"
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Frame>
  );
}
