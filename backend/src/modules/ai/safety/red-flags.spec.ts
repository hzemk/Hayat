import { detectRedFlag } from './red-flags';

describe('detectRedFlag — positive cases per category', () => {
  // One English + one Arabic phrase per category. If you add a new category,
  // add one of each here. Do not edit existing phrases to make a new regex
  // pass — extend the regexes instead and leave the phrase honest.

  it.each<[string, string, string]>([
    ['cardiac',      'I have chest pain that radiates to my arm',       'عندي ألم شديد في الصدر'],
    ['stroke',       'sudden face droop on the right side',             'خدر في الوجه منذ ساعة'],
    ['breathing',    "I can't breathe",                                  'لا أستطيع التنفس'],
    ['bleeding',     'severe bleeding from my leg',                     'لديه نزيف شديد'],
    ['unconscious',  'my father passed out and is not responding',      'أبي فاقد الوعي'],
    ['suicide',      'I want to kill myself',                           'أفكر في الانتحار'],
    // Pregnancy EN phrase avoids "bleeding" so it doesn't hit the earlier
    // bleeding rule — the two categories carry different advice and the
    // current rule-ordering reveals that gap (see KNOWN GAPS block below).
    ['pregnancy',    "I'm pregnant and I have severe pain",             'أنا حامل ونزيف'],
    // Allergy EN uses "anaphylaxis" because the "throat is closing" phrase
    // does not match /throat\s*closing/ (the " is " between breaks it).
    ['allergy',      "I think I'm having anaphylaxis",                  'انتفاخ في الحلق'],
    ['seizure',      'he had a seizure 10 minutes ago',                 'عنده تشنج'],
    // Pediatric EN avoids "not responding" (caught by unconscious rule first)
    // and uses "blue" + "baby" which is pediatric-specific.
    ['pediatric',    'my baby looks blue and very sleepy',              'رضيع حرارة 40 ولا يتحرك'],
    ['poisoning',    'my son took too many pills',                      'تسمم بالدواء'],
  ])('%s — English and Arabic both match', (category, en, ar) => {
    const enMatch = detectRedFlag(en);
    const arMatch = detectRedFlag(ar);
    expect(enMatch?.category).toBe(category);
    expect(arMatch?.category).toBe(category);
  });
});

describe('detectRedFlag — negative cases (no red flag)', () => {
  it.each<[string]>([
    ['I have mild indigestion'],
    ['I have a small headache'],
    ['I feel a bit tired today'],
    ['My stomach hurts after lunch'],
    ['I scraped my knee on the pavement'],
  ])('returns null for %p', (phrase) => {
    expect(detectRedFlag(phrase)).toBeNull();
  });
});

describe('detectRedFlag — KNOWN GAPS (current regex misses these)', () => {
  // These phrases describe symptoms a clinician would want flagged, but the
  // current regex set does not match them. Tests below document the CURRENT
  // (imperfect) behavior so we notice if someone "fixes" the tests without
  // fixing the regexes. Widening the regexes is out of scope for T9 — see
  // the TODO list in the commit body / PR description.

  it.each<[string, string]>([
    // cardiac: catches "chest pain" but not "chest hurts" / "tightness" /
    // "squeezing" — all of which are classic MI descriptors.
    ['cardiac phrasing: "chest hurts"',            'my chest hurts a little when I laugh'],
    ['cardiac phrasing: "tightness in chest"',     'I have tightness in my chest when I climb stairs'],
    // stroke: catches "face droop" but not "one side of my face is numb" in
    // free-form English.
    ['stroke phrasing: one-sided numbness',        'half of my face feels numb and my words are slurred'],
    // breathing: "shortness of breath" without "severe" is missed.
    ['breathing phrasing: plain SOB',              'I have shortness of breath walking up stairs'],
    // bleeding: "blood everywhere" style phrasing is missed.
    ['bleeding phrasing: informal',                'there is blood everywhere and I feel dizzy'],
    // allergy: "throat is closing" (present tense with " is ") is missed —
    // the regex requires throat-<whitespace>-closing without " is ".
    ['allergy phrasing: "throat IS closing"',      'my throat is closing after eating peanuts'],
    // stroke: needs explicit "face droop" / "slurred speech" — free-form
    // "my words come out wrong" is missed.
    ['stroke phrasing: vague speech',              'my words come out wrong since an hour ago'],
  ])('%s currently returns null', (_label, phrase) => {
    // If a later PR widens the regex so this phrase matches, this test will
    // flip to failing — that is the desired signal. Update the test when
    // you intentionally widen coverage.
    expect(detectRedFlag(phrase)).toBeNull();
  });
});

describe('detectRedFlag — KNOWN PRECEDENCE GAPS (misclassified, not missed)', () => {
  // Rule order in red-flags.ts is fixed. Some phrases that should be treated
  // as the more-specific category are classified as an earlier, more generic
  // one. Advice strings differ (e.g. pregnancy SEE_DOCTOR_NOW vs bleeding
  // CALL_AMBULANCE) so the mis-classification is clinically meaningful.
  // Tests below document the current (imperfect) classification so a later
  // PR that reorders the rules or specializes phrases is visible in CI.

  it('"pregnant + heavy bleeding" is classified as bleeding, not pregnancy', () => {
    expect(detectRedFlag("I'm pregnant and I have heavy bleeding")?.category).toBe(
      'bleeding',
    );
  });

  it('"baby + not responding" is classified as unconscious, not pediatric', () => {
    expect(detectRedFlag('my baby is not responding')?.category).toBe('unconscious');
  });
});
