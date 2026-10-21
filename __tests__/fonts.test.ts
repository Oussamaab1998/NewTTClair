// Every bundled face named by the theme is a real file whose name matches
// (PostScript name or family name, as the theme uses it: see the comment on
// `family` in src/theme/tokens.ts), and iOS registers it (Info.plist
// UIAppFonts). A wrong name silently falls back to the system font on device.
import fs from 'node:fs';
import path from 'node:path';

import { fontFiles, theme } from '../src/theme';

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

/** A Windows-platform name record of a TrueType file (1 family, 6 PostScript). */
function fontName(file: string, nameId: 1 | 6): string | undefined {
  const d = fs.readFileSync(file);
  const tables = d.readUInt16BE(4);
  for (let i = 0; i < tables; i++) {
    const rec = 12 + 16 * i;
    if (d.toString('latin1', rec, rec + 4) !== 'name') {
      continue;
    }
    const off = d.readUInt32BE(rec + 8);
    const count = d.readUInt16BE(off + 2);
    const strings = off + d.readUInt16BE(off + 4);
    for (let j = 0; j < count; j++) {
      const r = off + 6 + 12 * j;
      if (d.readUInt16BE(r) === 3 && d.readUInt16BE(r + 6) === nameId) {
        const start = strings + d.readUInt16BE(r + 10);
        const bytes = d.subarray(start, start + d.readUInt16BE(r + 8));
        return Buffer.from(bytes).swap16().toString('utf16le');
      }
    }
  }
  return undefined;
}

function plistFonts(): string[] {
  const plist = fs.readFileSync(
    path.join(ROOT, 'ios/NewTTClair/Info.plist'),
    'utf8',
  );
  const block = /<key>UIAppFonts<\/key>\s*<array>([\s\S]*?)<\/array>/.exec(
    plist,
  );
  return [...(block?.[1] ?? '').matchAll(/<string>([^<]+)<\/string>/g)].map(
    m => m[1] ?? '',
  );
}

const bundledFamilies = [
  ...Object.values(theme.font.family.ui),
  ...Object.values(theme.font.family.math),
];

test('every bundled family token has a font file', () => {
  const names = new Set(fontFiles.map(f => f.name));
  expect(bundledFamilies.filter(f => !names.has(f))).toEqual([]);
});

test.each(fontFiles.map(f => [f.file, f] as const))(
  '%s: exists and its name matches the theme',
  (_, { file, name, by }) => {
    const full = path.join(ASSETS, file);
    expect(fs.existsSync(full)).toBe(true);
    expect(fontName(full, by === 'postScript' ? 6 : 1)).toBe(name);
  },
);

test('iOS registers exactly the bundled files', () => {
  expect(plistFonts().sort()).toEqual(fontFiles.map(f => f.file).sort());
});

test('each font folder ships its licence', () => {
  const dirs = new Set(fontFiles.map(f => path.dirname(f.file)));
  for (const dir of dirs) {
    const licence = path.join(ASSETS, dir, 'OFL.txt');
    expect(fs.readFileSync(licence, 'utf8')).toContain(
      'SIL OPEN FONT LICENSE Version 1.1',
    );
  }
});
