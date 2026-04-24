import { api } from './client';

export type ReminderType = 'MEDICATION' | 'APPOINTMENT' | 'CHECKUP' | 'OTHER';
export type ReminderStatus = 'PENDING' | 'DONE' | 'SKIPPED';
export type ReminderSource = 'MANUAL' | 'PRESCRIPTION' | 'DOCTOR';

export interface ReminderDoctor {
  id: string;
  fullName: string | null;
  email: string;
  specialty: string | null;
  specialtyAr: string | null;
  photoUrl: string | null;
}

export interface ReminderPrescriptionItem {
  id: string;
  medicationName: string;
  dose: string | null;
  frequency: string | null;
  durationDays: number | null;
  instructionsAr: string | null;
  instructionsEn: string | null;
}

export interface ReminderPrescription {
  id: string;
  issuedAt: string;
  expiresAt: string | null;
  notes: string | null;
  items: ReminderPrescriptionItem[];
}

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  subtitle: string | null;
  scheduledAt: string;
  endsAt: string | null;
  recurrence: string | null;
  status: ReminderStatus;
  source: ReminderSource;
  completedAt: string | null;
  prescriptionId: string | null;
  doctor: ReminderDoctor | null;
  prescription: ReminderPrescription | null;
}

export async function listReminders() {
  const { data } = await api.get<Reminder[]>('/reminders');
  return data;
}

export async function listUpcomingReminders(limit = 5) {
  const { data } = await api.get<Reminder[]>('/reminders', {
    params: { scope: 'upcoming', limit },
  });
  return data;
}

export async function getReminder(id: string) {
  const { data } = await api.get<Reminder>(`/reminders/${id}`);
  return data;
}
