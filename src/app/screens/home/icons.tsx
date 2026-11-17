/**
 * Line icons of the home screen (react-native-svg, 24-unit grid, the trip
 * icons' stroke): one per domain, and the exam sheet. Decorative: the words
 * next to them carry the meaning (never an icon or a colour alone).
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { theme } from '../../../theme';
import type { HomeDomain } from './home';

const VIEW = '0 0 24 24';
const STROKE = theme.border.thick;

interface IconProps {
  size?: number;
  color?: string;
}

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

const line = (color: string) => ({
  fill: 'none',
  stroke: color,
  strokeWidth: STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** Probabilités: a die. */
function DieIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Rect x="4" y="4" width="16" height="16" rx="4" {...line(color)} />
      <Circle cx="9" cy="9" r="1.5" fill={color} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      <Circle cx="15" cy="15" r="1.5" fill={color} />
    </Frame>
  );
}

/** Analyse: a curve on its axes. */
function CurveIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Path d="M4 4v16h16" {...line(color)} />
      <Path d="M7 16c3 0 4-9 7-9s3 4 5 4" {...line(color)} />
    </Frame>
  );
}

/** Suites: steps going up. */
function StepsIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Path d="M4 20h4v-4h4v-4h4V8h4" {...line(color)} />
    </Frame>
  );
}

/** Complexes: a point on the unit circle. */
function PlaneIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Circle cx="12" cy="12" r="8" {...line(color)} />
      <Path d="M12 2v20M2 12h20" {...line(color)} />
      <Circle cx="17.5" cy="6.5" r="1.8" fill={color} />
    </Frame>
  );
}

export function DomainIcon({
  domain,
  ...p
}: IconProps & { domain: HomeDomain }) {
  switch (domain) {
    case 'probability':
      return <DieIcon {...p} />;
    case 'analysis':
      return <CurveIcon {...p} />;
    case 'sequences':
      return <StepsIcon {...p} />;
    case 'complex':
      return <PlaneIcon {...p} />;
  }
}

/** The exam sheet (opens the paper screen). */
export function SheetIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Path d="M6 3h8l4 4v14H6z" {...line(color)} />
      <Path d="M14 3v4h4M9 12h6M9 16h6" {...line(color)} />
    </Frame>
  );
}
