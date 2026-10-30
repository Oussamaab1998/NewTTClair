/**
 * The profile as the tutor reads it at the start of a question (first user
 * message, never the cached system prompt): his year, the state of the skills
 * this question uses and their older prerequisites (with the school year),
 * what the tutor noticed before, and the last sessions. Deterministic and
 * short (about 2,500 characters at most).
 */
import { SKILLS } from '../../content/skills';
import type { QuestionNotes } from '../packs/notes';
import type { StudentProfile } from './profile';

const MAX_CHARS = 2500;

/** The question's skills and every prerequisite below them. */
export function prerequisiteClosure(ids: readonly string[]): string[] {
  const byId = new Map(SKILLS.map.skills.map(s => [s.id, s]));
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    out.push(id);
    for (const r of byId.get(id)?.requires ?? []) {
      walk(r);
    }
  };
  ids.forEach(walk);
  return out;
}

export function profileDigest(
  p: StudentProfile | null,
  notes: QuestionNotes | null,
): string {
  if (!p) {
    return 'new student, no history yet.';
  }
  const byId = new Map(SKILLS.map.skills.map(s => [s.id, s]));
  const lines: string[] = [];
  lines.push(
    `Year: ${p.year ?? 'unknown'}; section: ${
      p.section ?? 'unknown'
    }; first check ${p.diagnosticDone ? 'done' : 'not done'}; ${
      p.sessions.length
    } questions so far.`,
  );
  const relevant = prerequisiteClosure([
    ...(notes?.skills ?? []),
    ...(notes?.prerequisites ?? []),
  ]);
  const skillLines = relevant
    .map(id => {
      const r = p.skills[id];
      if (!r || r.level === 'unknown') {
        return null;
      }
      const slips = Object.entries(r.slips)
        .map(([k, n]) => `${k}×${n}`)
        .join(', ');
      const year = byId.get(id)?.year;
      return `- ${id}${year ? ` (${year})` : ''}: ${r.level}; first try ${
        r.firstTry
      }, after help ${r.afterHelp}${slips ? `; slips ${slips}` : ''}`;
    })
    .filter((l): l is string => l !== null);
  lines.push(
    skillLines.length > 0
      ? `Skills this question uses (evidence from earlier sessions):\n${skillLines.join(
          '\n',
        )}`
      : 'No evidence yet on the skills this question uses.',
  );
  const obs = p.observations
    .filter(o => o.status !== 'dropped')
    .filter(
      o =>
        !o.skill ||
        relevant.includes(o.skill) ||
        o.kind === 'language' ||
        o.kind === 'habit',
    )
    .slice(-8);
  if (obs.length > 0) {
    lines.push(
      `What tutors noticed (hypotheses; ${
        obs.filter(o => o.status === 'confirmed').length
      } confirmed):\n${obs
        .map(
          o =>
            `- [${o.status}] ${o.kind}${o.skill ? ` ${o.skill}` : ''}: ${
              o.note
            }${
              o.evidence.length > 0
                ? ` (his lines: ${o.evidence.slice(0, 3).join(' ; ')})`
                : ''
            }`,
        )
        .join('\n')}`,
    );
  }
  const last = p.sessions.slice(-3);
  if (last.length > 0) {
    lines.push(
      `Last sessions:\n${last
        .map(
          s =>
            `- ${s.exerciseId} q${s.questionId}: ${s.outcome}, ${
              s.studentTurns
            } turns, «ما نعرفش» ×${s.dontKnows}. ${s.summary.slice(0, 280)}${
              s.nextTime ? ` Next time: ${s.nextTime.slice(0, 160)}` : ''
            }`,
        )
        .join('\n')}`,
    );
  }
  const text = lines.join('\n');
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS - 1)}…` : text;
}
