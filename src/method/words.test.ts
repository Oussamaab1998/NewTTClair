import { studentFacingIssues, normaliseArabic } from './words';

const ar = (text: string) => ({ ar: [{ ar: text }] });

describe('student-facing strings of a method block (D41)', () => {
  it('never say "part" or "combine": they hand out the decomposition', () => {
    expect(studentFacingIssues({ fr: 'Calculer chaque partie' })).toContain(
      'banned_word',
    );
    expect(studentFacingIssues({ fr: 'Il faut combiner les deux' })).toContain(
      'banned_word',
    );
    expect(studentFacingIssues(ar('احسب كل جزء'))).toContain('banned_word');
    expect(studentFacingIssues(ar('نجمّعو الأجزاء'))).toContain('banned_word'); // with the shadda
    expect(studentFacingIssues(ar('نجمعو الاجزاء'))).toContain('banned_word'); // without it
  });

  it('allow the words that only look alike', () => {
    expect(studentFacingIssues({ fr: 'Départ et partage' })).toEqual([]);
    expect(studentFacingIssues(ar('نعدّو التيراجات الكل'))).toEqual([]);
  });

  it('a header never holds a digit or a formula (so never a value)', () => {
    expect(studentFacingIssues(ar('الكل'), { header: true })).toEqual([]);
    expect(
      studentFacingIssues({ fr: 'Il y a 120 tirages' }, { header: true }),
    ).toContain('digit');
    expect(
      studentFacingIssues({ math: 'C_{10}^{3}' }, { header: true }),
    ).toContain('math');
  });

  it('a header never gives the how inside "count": orderings, factorial, choose', () => {
    expect(
      studentFacingIssues(ar('نقسمو على الترتيبات'), { header: true }),
    ).toContain('how_word');
    expect(
      studentFacingIssues(
        { fr: 'divisé par la factorielle' },
        { header: true },
      ),
    ).toContain('how_word');
    expect(
      studentFacingIssues({ fr: 'une combinaison de 3' }, { header: true }),
    ).toContain('how_word');
    expect(
      studentFacingIssues(ar('نختارو 3 من 10'), { header: true }),
    ).toContain('digit');
    // the coarse step may say divide, and the read step may say order
    expect(
      studentFacingIssues(ar('نقسمو المطلوب على الكل'), { header: true }),
    ).toEqual([]);
    expect(
      studentFacingIssues(ar('واش الترتيب يهمّ ولا لا'), { header: true }),
    ).toEqual([]);
  });

  it('the opening card has no digit and no formula', () => {
    expect(
      studentFacingIssues(ar('خطة، عدّ، تثبّت، ورقة'), { header: true }),
    ).toEqual([]);
    expect(studentFacingIssues(ar('الخطوة 1'), { header: true })).toContain(
      'digit',
    );
  });
});

describe('Arabic normalisation', () => {
  it('drops the diacritics and the tatweel, and unifies alef forms', () => {
    expect(normaliseArabic('نجمّعو')).toBe('نجمعو');
    expect(normaliseArabic('أجزاء')).toBe('اجزاء');
    expect(normaliseArabic('جـزء')).toBe('جزء');
  });
});
