# Curriculum map (official chapters)

Status: Proposed, 2026-11-17. `reviewed: false` until a Tunisian maths teacher checks it.
Data: `src/content/curriculumMap.json`. Typed access: `src/content/curriculum.ts`. Tests: `src/content/curriculum.test.ts`.

## What it is
For each school year and **scientific** section (owner decision, 2026-11-17), the maths chapters in textbook order.
The onboarding (year + section picker) and the coming chapter picker read it. The AI tutor can use it to name the chapter a gap comes from.

| Year | Sections (ids) | Track | Chapters |
|---|---|---|---|
| 1ère (`1s`) | none, tronc commun | `1s` | 16 |
| 2ème (`2s`) | `sciences`, `technologies-informatique` (one programme, one book) | `2s-sc` | 19 |
| 3ème (`3s`) | `mathematiques` / `sciences-experimentales` / `sciences-techniques` / `sciences-informatique` | `3s-m` / `3s-se` / `3s-st` / `3s-si` | 23 / 20 / 19 / 15 |
| 4ème Bac (`4s`) | same four | `4s-m` / `4s-se` / `4s-st` / `4s-si` | 19 / 17 / 16 / 14 |

Chapter id = `<track>.<slug>`, for example `4s-m.probabilites`. The same concept keeps the same slug across sections (`fonction-exponentielle`, `suites-reelles`, …).
Each chapter has a `domain` (analysis, sequences, probability, counting, statistics, geometry, trigonometry, space, complex, arithmetic, algebra, numbers, logic). It may also have `topics` (short hints), `skills` (skillMap ids) and `exercises` (our exercises, optionally limited to some `parts`).

## Sources
- Official programmes: [1ère & 2ème, Sept. 2005](https://www.sigmaths.net/Programme%20math_1_2anne.pdf), [3ème & 4ème, Sept. 2006](https://www.sigmaths.net/Programme%20math_3_4.pdf). Used to check that every chapter is in the section's programme. This is how probability was confirmed in all four 3ème sections, and no statistics in 3ème Sc. info.
- CNP textbooks (tables of contents read on [sigmaths.net/manuels](https://www.sigmaths.net/manuels/), 2026-11-17). Chapter titles and order come from them. Three textbooks (4ème Maths tome 1, 4ème Sc. exp. tomes 1-2) are scanned images, and 4ème Sc. techniques is the 2007-2008 edition. Their contents pages were read from screenshots.

## Caveats (also in the data `note`)
- Titles are lightly normalised. `IR` is written ℝ. The missing set symbol in «Divisibilité dans» is read as ℕ in 3ème and ℤ in 4ème, from the programmes. 4ème Sc. info chapter 14 («Probabilité» in the book) is named «Variables aléatoires».
- In 2ème, dénombrement sits inside the «Arithmétique» chapter (textbook p. 62), so there is no separate chapter.
- In 4ème Sc. info, graph theory sits inside «Systèmes d'équations linéaires» and «Probabilités», with no separate chapter.
- The programmes date from 2005-2006. No later reform was found, but a teacher should confirm the current year's content.
- Chapter titles are French only (students know chapters by their textbook names). Derja names are an open owner question.
- Skill years in `skillMap.json` disagree with the programme for counting skills: `combinations-count` and the other counting skills are marked `4s`, but the programme teaches dénombrement in 3ème. The map links them to the 3ème «Dénombrement» chapters. The skill map itself was not changed.
