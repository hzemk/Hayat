// Pure helpers for the Quit Smoking / Life Tree feature. No React, no
// storage, no side-effects — keeps the store and components thin and the
// logic unit-testable.

export type TreeStage = 'seed' | 'sprout' | 'plant' | 'young' | 'full';

export interface TreeStageMeta {
  stage: TreeStage;
  /** Inclusive day threshold to enter this stage. */
  fromDay: number;
}

// Stage thresholds chosen so the user feels rapid early progress (seed → sprout
// in 3 days) and a meaningful long-term goal (full tree at 30 days, the
// standard "habit reset" mark). Day 0 = setup day.
export const STAGE_THRESHOLDS: TreeStageMeta[] = [
  { stage: 'seed', fromDay: 0 },
  { stage: 'sprout', fromDay: 3 },
  { stage: 'plant', fromDay: 7 },
  { stage: 'young', fromDay: 14 },
  { stage: 'full', fromDay: 30 },
];

export function stageForDays(days: number): TreeStage {
  let current: TreeStage = 'seed';
  for (const t of STAGE_THRESHOLDS) {
    if (days >= t.fromDay) current = t.stage;
  }
  return current;
}

export function nextStageInfo(
  days: number,
): { next: TreeStage | null; daysLeft: number | null } {
  const idx = STAGE_THRESHOLDS.findIndex((t) => days < t.fromDay);
  if (idx === -1) return { next: null, daysLeft: null };
  const next = STAGE_THRESHOLDS[idx];
  return { next: next.stage, daysLeft: Math.max(0, next.fromDay - days) };
}

// Each slip pulls the user back ONE stage's worth of days — never below
// zero. Choice over a hard reset: research shows hard resets demotivate,
// while a soft regression keeps the user engaged.
export function effectiveDaysAfterSlips(
  rawStreakDays: number,
  slipCount: number,
): number {
  if (slipCount <= 0) return Math.max(0, rawStreakDays);
  // Sum of "stage gaps" up to slipCount, not exceeding the highest stage.
  const gaps = [3, 4, 7, 16]; // sprout=3, plant=7-3=4, young=14-7=7, full=30-14=16
  let penalty = 0;
  for (let i = 0; i < slipCount; i++) {
    penalty += gaps[Math.min(i, gaps.length - 1)];
  }
  return Math.max(0, rawStreakDays - penalty);
}

// Days between two dates, ignoring time of day (rounded down to local midnight).
export function daysBetween(from: Date, to: Date): number {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(0, Math.floor((startOfDay(to) - startOfDay(from)) / 86400000));
}

// Money saved given user setup. Defaults: 20 cigarettes per pack.
export function moneySaved(opts: {
  daysClean: number;
  cigarettesPerDay: number;
  pricePerPack: number;
  cigarettesPerPack?: number;
}): number {
  const perPack = opts.cigarettesPerPack ?? 20;
  if (perPack <= 0) return 0;
  const cigarettesAvoided = opts.daysClean * opts.cigarettesPerDay;
  const packsAvoided = cigarettesAvoided / perPack;
  return Math.round(packsAvoided * opts.pricePerPack * 100) / 100;
}

export function cigarettesAvoided(daysClean: number, cigarettesPerDay: number) {
  return daysClean * cigarettesPerDay;
}

// Short-term + medium-term physiological recovery milestones the user can
// see "tick off" as their streak grows. Sourced from the standard public
// health timeline (NHS / CDC). Kept brief; we're a tracker, not a textbook.
export interface HealthMilestone {
  id: string;
  /** Hours since quitting. */
  hours: number;
  title: { en: string; ar: string };
  body: { en: string; ar: string };
}

export const HEALTH_MILESTONES: HealthMilestone[] = [
  {
    id: 'h-20m',
    hours: 1 / 3,
    title: { en: '20 minutes', ar: '٢٠ دقيقة' },
    body: {
      en: 'Heart rate and blood pressure begin to drop.',
      ar: 'يبدأ معدل ضربات القلب وضغط الدم بالانخفاض.',
    },
  },
  {
    id: 'h-8h',
    hours: 8,
    title: { en: '8 hours', ar: '٨ ساعات' },
    body: {
      en: 'Carbon monoxide in the blood drops by half.',
      ar: 'ينخفض ثاني أكسيد الكربون في الدم إلى النصف.',
    },
  },
  {
    id: 'h-24h',
    hours: 24,
    title: { en: '1 day', ar: 'يوم واحد' },
    body: {
      en: 'Risk of a heart attack starts to decrease.',
      ar: 'يبدأ خطر النوبة القلبية بالانخفاض.',
    },
  },
  {
    id: 'h-72h',
    hours: 72,
    title: { en: '3 days', ar: '٣ أيام' },
    body: {
      en: 'Breathing feels easier as bronchial tubes relax.',
      ar: 'يصبح التنفس أسهل مع استرخاء الشعب الهوائية.',
    },
  },
  {
    id: 'h-2w',
    hours: 24 * 14,
    title: { en: '2 weeks', ar: 'أسبوعان' },
    body: {
      en: 'Circulation improves; lung function rises up to 30%.',
      ar: 'تتحسن الدورة الدموية وترتفع وظائف الرئة حتى ٣٠٪.',
    },
  },
  {
    id: 'h-1m',
    hours: 24 * 30,
    title: { en: '1 month', ar: 'شهر واحد' },
    body: {
      en: 'Coughing and shortness of breath noticeably ease.',
      ar: 'يقل السعال وضيق التنفس بشكل ملحوظ.',
    },
  },
  {
    id: 'h-3m',
    hours: 24 * 90,
    title: { en: '3 months', ar: '٣ أشهر' },
    body: {
      en: 'Lung function continues to recover.',
      ar: 'تستمر وظائف الرئة في التعافي.',
    },
  },
  {
    id: 'h-1y',
    hours: 24 * 365,
    title: { en: '1 year', ar: 'سنة كاملة' },
    body: {
      en: 'Risk of coronary heart disease drops by half.',
      ar: 'ينخفض خطر أمراض القلب التاجية إلى النصف.',
    },
  },
];

export function lastReachedMilestone(daysClean: number): HealthMilestone | null {
  const hours = daysClean * 24;
  let last: HealthMilestone | null = null;
  for (const m of HEALTH_MILESTONES) {
    if (hours >= m.hours) last = m;
  }
  return last;
}

export function nextMilestone(daysClean: number): HealthMilestone | null {
  const hours = daysClean * 24;
  return HEALTH_MILESTONES.find((m) => hours < m.hours) ?? null;
}

// Small, deterministic library of motivational lines — picked by the streak
// day so the same day always shows the same message (no flicker on re-renders).
const MESSAGES_EN = [
  'Every breath today is a gift to your future self.',
  'Your lungs are already thanking you.',
  'One craving at a time. You\'ve got this.',
  'Money in your pocket, life in your lungs.',
  'The hardest part is behind you. Keep going.',
  'You are stronger than the urge.',
  'Small, daily wins build a free life.',
  'Your future self is cheering you on.',
  'You\'re rewriting your story, one smoke-free day at a time.',
  'Stay close to people who lift you up today.',
];

const MESSAGES_AR = [
  'كل نفس اليوم هدية لذاتك المستقبلية.',
  'رئتاك تشكرانك بالفعل.',
  'رغبة واحدة في كل مرة. أنت قادر.',
  'مال في جيبك وحياة في رئتيك.',
  'أصعب جزء أصبح خلفك. واصل.',
  'أنت أقوى من الإغراء.',
  'انتصارات يومية صغيرة تبني حياة حرة.',
  'ذاتك المستقبلية تشجعك.',
  'تعيد كتابة قصتك يومًا تلو الآخر.',
  'ابقَ قريبًا اليوم من من يدعمك.',
];

export function dailyMessage(daysClean: number, locale: 'ar' | 'en'): string {
  const arr = locale === 'ar' ? MESSAGES_AR : MESSAGES_EN;
  return arr[daysClean % arr.length];
}
