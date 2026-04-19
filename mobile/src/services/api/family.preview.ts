import { FamilyMember } from './family.api';
import { Reminder } from './reminders.api';

function atTime(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function yearsAgo(years: number, month: number, day: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years, month - 1, day);
  return d.toISOString().slice(0, 10);
}

const omarReminders: Reminder[] = [
  {
    id: 'prev-rem-omar-1',
    type: 'MEDICATION',
    title: 'Lantus insulin · 10 units',
    subtitle: 'Long-acting · subcutaneous',
    scheduledAt: atTime(8, 0),
    recurrence: 'daily',
    status: 'PENDING',
    source: 'MANUAL',
    completedAt: null,
    endsAt: null,
  },
  {
    id: 'prev-rem-omar-2',
    type: 'MEDICATION',
    title: 'NovoRapid · before lunch',
    subtitle: 'Check blood sugar first',
    scheduledAt: atTime(12, 30),
    recurrence: 'daily',
    status: 'PENDING',
    source: 'MANUAL',
    completedAt: null,
    endsAt: null,
  },
  {
    id: 'prev-rem-omar-3',
    type: 'MEDICATION',
    title: 'Ventolin inhaler · 2 puffs',
    subtitle: 'Preventive dose before evening play',
    scheduledAt: atTime(17, 0),
    recurrence: 'daily',
    status: 'PENDING',
    source: 'MANUAL',
    completedAt: null,
    endsAt: null,
  },
  {
    id: 'prev-rem-omar-4',
    type: 'MEDICATION',
    title: 'NovoRapid · before dinner',
    subtitle: 'Check blood sugar first',
    scheduledAt: atTime(18, 30),
    recurrence: 'daily',
    status: 'PENDING',
    source: 'MANUAL',
    completedAt: null,
    endsAt: null,
  },
  {
    id: 'prev-rem-omar-5',
    type: 'CHECKUP',
    title: 'Bedtime blood sugar check',
    subtitle: 'Target 90-150 mg/dL',
    scheduledAt: atTime(21, 30),
    recurrence: 'daily',
    status: 'PENDING',
    source: 'MANUAL',
    completedAt: null,
    endsAt: null,
  },
];

const laylaReminders: Reminder[] = [
  {
    id: 'prev-rem-layla-1',
    type: 'CHECKUP',
    title: 'Annual pediatric check-up',
    subtitle: 'Dr. Rana · King Hussein Medical City',
    scheduledAt: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 12);
      d.setHours(10, 0, 0, 0);
      return d.toISOString();
    })(),
    recurrence: null,
    status: 'PENDING',
    source: 'MANUAL',
    completedAt: null,
    endsAt: null,
  },
];

export const PREVIEW_FAMILY: FamilyMember[] = [
  {
    id: 'prev-omar',
    guardianId: 'preview',
    sanadSubject: 'sanad-mock-omar',
    nationalId: '9991234567',
    fullName: 'Omar Al-Tahat',
    dateOfBirth: yearsAgo(7, 3, 14),
    gender: 'MALE',
    relationship: 'son',
    bloodType: 'A+',
    allergies: ['Penicillin', 'Peanuts'],
    conditions: ['Type 1 Diabetes', 'Severe Asthma'],
    needsUrgentCare: true,
    urgentCareNote:
      'Recent hypoglycemia episodes at school. Monitor blood sugar every 3 hours and keep fast-acting glucose available.',
    medications: [
      {
        id: 'prev-med-omar-1',
        name: 'Lantus (insulin glargine)',
        dose: '10 units',
        frequency: 'Once daily · 08:00',
        notes: 'Subcutaneous, rotate injection site',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prev-med-omar-2',
        name: 'NovoRapid (insulin aspart)',
        dose: '4-6 units',
        frequency: 'Before each meal',
        notes: 'Adjust per carb count',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'prev-med-omar-3',
        name: 'Ventolin (salbutamol) inhaler',
        dose: '2 puffs',
        frequency: 'As needed · and at 17:00',
        notes: 'Use spacer device',
        createdAt: new Date().toISOString(),
      },
    ],
    reminders: omarReminders,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prev-layla',
    guardianId: 'preview',
    sanadSubject: 'sanad-mock-layla',
    nationalId: '9991234568',
    fullName: 'Layla Al-Tahat',
    dateOfBirth: yearsAgo(10, 7, 2),
    gender: 'FEMALE',
    relationship: 'daughter',
    bloodType: 'O+',
    allergies: [],
    conditions: [],
    needsUrgentCare: false,
    urgentCareNote: null,
    medications: [],
    reminders: laylaReminders,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prev-zaid',
    guardianId: 'preview',
    sanadSubject: 'sanad-mock-zaid',
    nationalId: '9991234569',
    fullName: 'Zaid Al-Tahat',
    dateOfBirth: yearsAgo(4, 11, 20),
    gender: 'MALE',
    relationship: 'son',
    bloodType: 'B+',
    allergies: ['Eggs'],
    conditions: [],
    needsUrgentCare: false,
    urgentCareNote: null,
    medications: [],
    reminders: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function findPreviewMember(id: string): FamilyMember | undefined {
  return PREVIEW_FAMILY.find((m) => m.id === id);
}
