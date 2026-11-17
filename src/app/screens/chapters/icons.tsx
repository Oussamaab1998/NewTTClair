/**
 * Line icons of the chapter picker (react-native-svg, 24-unit grid, the home
 * icons' stroke): one per curriculum domain, plus the question-count pencil and
 * the «قريبا» clock. Decorative: the words next to them carry the meaning.
 */
import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import type { Domain, SectionId } from '../../../content/curriculum';
import { theme } from '../../../theme';
import { DomainIcon } from '../home/icons';

const VIEW = '0 0 24 24';

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
  strokeWidth: theme.border.thick,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** The shapes of the domains the home has no icon for. */
const PATHS: Partial<Record<Domain, (c: string) => React.ReactNode>> = {
  // Dénombrement: a choice tree.
  counting: c => (
    <>
      <Path d="M4 12l7-6M4 12l7 6M11 6l8-2M11 6l8 3M11 18l8-3M11 18l8 2" {...line(c)} />
      <Circle cx="4" cy="12" r="1.6" fill={c} />
    </>
  ),
  // Statistiques: bars.
  statistics: c => <Path d="M4 20h16M7 20v-6M12 20V6M17 20v-9" {...line(c)} />,
  // Géométrie: a triangle.
  geometry: c => <Path d="M12 4l8 15H4z" {...line(c)} />,
  // Trigonométrie: an angle and its arc.
  trigonometry: c => (
    <Path d="M4 19h16M4 19L16 6M10 19a6 6 0 0 0-1.6-4.2" {...line(c)} />
  ),
  // Espace: a cube.
  space: c => (
    <Path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" {...line(c)} />
  ),
  // Arithmétique: #.
  arithmetic: c => <Path d="M9 4L7 20M17 4l-2 16M5 9h15M4 15h15" {...line(c)} />,
  // Algèbre: an unknown x in brackets.
  algebra: c => (
    <Path d="M7 5c-3 4-3 10 0 14M17 5c3 4 3 10 0 14M9.5 9l5 6M14.5 9l-5 6" {...line(c)} />
  ),
  // Calcul numérique: a number line.
  numbers: c => <Path d="M3 12h18M6 9v6M12 9v6M18 9v6" {...line(c)} />,
  // Logique: «et» (∧) between two truth dots.
  logic: c => (
    <>
      <Path d="M7 18l5-12 5 12" {...line(c)} />
      <Circle cx="4" cy="6" r="1.6" fill={c} />
      <Circle cx="20" cy="6" r="1.6" fill={c} />
    </>
  ),
};

export function ChapterDomainIcon({
  domain,
  size,
  color = theme.color.ink,
}: IconProps & { domain: Domain }) {
  if (
    domain === 'analysis' ||
    domain === 'probability' ||
    domain === 'sequences' ||
    domain === 'complex'
  ) {
    return (
      <DomainIcon domain={domain} color={color} {...(size !== undefined && { size })} />
    );
  }
  return <Frame size={size}>{PATHS[domain]?.(color)}</Frame>;
}

/** A chapter's questions (next to their number). */
export function PencilIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Path d="M5 19l1-4L16 5l3 3L9 18zM14 7l3 3" {...line(color)} />
    </Frame>
  );
}

/** «قريبا»: not ready yet. */
export function ClockIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Circle cx="12" cy="12" r="8" {...line(color)} />
      <Path d="M12 8v4l3 2" {...line(color)} />
    </Frame>
  );
}

/** The class chip («بدّل»). */
export function SchoolIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Path d="M3 9l9-4 9 4-9 4zM7 11v5c3 2 7 2 10 0v-5" {...line(color)} />
    </Frame>
  );
}

/** A class without exercises yet: in the works (an hourglass, never a lock). */
export function HourglassIcon({ size, color = theme.color.ink }: IconProps) {
  return (
    <Frame size={size}>
      <Path d="M6 3h12M6 21h12" {...line(color)} />
      <Path d="M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9" {...line(color)} />
    </Frame>
  );
}

/** The section cards of the class picker. */
const SECTION_PATHS: Record<Exclude<SectionId, 'mathematiques'>, (c: string) => React.ReactNode> = {
  // 2ème Sciences: an atom.
  sciences: c => (
    <>
      <Ellipse cx="12" cy="12" rx="9" ry="3.5" {...line(c)} />
      <Ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)" {...line(c)} />
      <Ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(120 12 12)" {...line(c)} />
      <Circle cx="12" cy="12" r="1.5" fill={c} />
    </>
  ),
  // Technologies de l'informatique: a laptop.
  'technologies-informatique': c => (
    <>
      <Rect x="4" y="5" width="16" height="11" rx="1.5" {...line(c)} />
      <Path d="M2 19h20" {...line(c)} />
    </>
  ),
  // Sciences expérimentales: a flask.
  'sciences-experimentales': c => (
    <Path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 15h9" {...line(c)} />
  ),
  // Sciences techniques: a gear.
  'sciences-techniques': c => (
    <>
      <Circle cx="12" cy="12" r="3" {...line(c)} />
      <Path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"
        {...line(c)}
      />
    </>
  ),
  // Sciences de l'informatique: code brackets.
  'sciences-informatique': c => (
    <Path d="M9 7l-5 5 5 5M15 7l5 5-5 5M13.5 5l-3 14" {...line(c)} />
  ),
};

export function SectionIcon({
  section,
  size,
  color = theme.color.ink,
}: IconProps & { section: SectionId }) {
  if (section === 'mathematiques') {
    return (
      <DomainIcon domain="analysis" color={color} {...(size !== undefined && { size })} />
    );
  }
  return <Frame size={size}>{SECTION_PATHS[section](color)}</Frame>;
}
