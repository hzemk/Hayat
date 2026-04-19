import {
  PrescriptionItem,
  Prisma,
  ReminderSource,
  ReminderType,
} from '@prisma/client';

// Default intake times by doses-per-day. Chosen to avoid night waking for low-N
// and to spread evenly enough for the body.
const DOSE_HOUR_MAP: Record<number, number[]> = {
  1: [9],
  2: [9, 21],
  3: [8, 14, 20],
  4: [7, 13, 19, 23],
  5: [7, 11, 15, 19, 23],
  6: [6, 10, 14, 18, 22, 2],
};

const MAX_DAYS = 14;
const DEFAULT_DAYS = 7;

/**
 * Parse a freeform frequency like "3× per day", "every 8 hours", "twice daily",
 * or Arabic "مرتين يوميا" into a list of 24h clock hours for a single day.
 * Unknown patterns fall back to once at 09:00.
 */
export function parseFrequencyToHours(raw: string): number[] {
  const s = raw.trim().toLowerCase();

  // "every N hours" / "كل N ساعات"
  const everyN = s.match(/(?:every|كل)\s*(\d{1,2})\s*(?:hour|hr|h|ساعة|ساعات)/);
  if (everyN) {
    const gap = Math.max(1, Math.min(24, parseInt(everyN[1], 10)));
    const count = Math.min(6, Math.floor(24 / gap));
    if (count >= 1) {
      return DOSE_HOUR_MAP[count] ?? DOSE_HOUR_MAP[3];
    }
  }

  // "3× per day", "3x daily", "3 times", "ثلاث مرات"
  const timesMatch = s.match(/(\d)\s*(?:×|x|times|مرات|مرة)/);
  if (timesMatch) {
    const n = parseInt(timesMatch[1], 10);
    if (DOSE_HOUR_MAP[n]) return DOSE_HOUR_MAP[n];
  }

  if (/(once|one time|مرة واحدة|يوميا|يومياً|daily)/.test(s) && !/twice|three|four/.test(s)) {
    return DOSE_HOUR_MAP[1];
  }
  if (/(twice|2\s*times|مرتين)/.test(s)) return DOSE_HOUR_MAP[2];
  if (/(three times|ثلاث مرات)/.test(s)) return DOSE_HOUR_MAP[3];
  if (/(four times|أربع مرات)/.test(s)) return DOSE_HOUR_MAP[4];

  if (/bedtime|night|قبل النوم|ليلا/.test(s)) return [22];
  if (/morning|صباح/.test(s) && !/evening|مساء/.test(s)) return [9];
  if (/evening|مساء/.test(s)) return [19];

  return DOSE_HOUR_MAP[1];
}

/**
 * Build the list of Reminder rows that should be created alongside a new
 * prescription. Starts at the next matching hour (or now if the first hour of
 * day has already passed).
 */
export function buildPrescriptionReminders(
  patientUserId: string,
  items: Array<Pick<PrescriptionItem, 'medicationName' | 'dose' | 'frequency' | 'durationDays'>>,
  now: Date = new Date(),
): Prisma.ReminderCreateManyInput[] {
  const rows: Prisma.ReminderCreateManyInput[] = [];

  for (const item of items) {
    const hours = parseFrequencyToHours(item.frequency);
    const days = Math.max(
      1,
      Math.min(MAX_DAYS, item.durationDays ?? DEFAULT_DAYS),
    );

    const title = `Take ${item.medicationName}`;
    const subtitle = `${item.dose} · ${item.frequency}`;

    for (let day = 0; day < days; day += 1) {
      for (const hour of hours) {
        const when = new Date(now);
        when.setDate(when.getDate() + day);
        when.setHours(hour, 0, 0, 0);
        if (when.getTime() <= now.getTime()) continue;

        rows.push({
          userId: patientUserId,
          type: ReminderType.MEDICATION,
          source: ReminderSource.PRESCRIPTION,
          title,
          subtitle,
          scheduledAt: when,
        });
      }
    }
  }

  return rows;
}
