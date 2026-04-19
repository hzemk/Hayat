import { api } from './client';

export type ReminderType = 'MEDICATION' | 'APPOINTMENT' | 'CHECKUP' | 'OTHER';
export type ReminderStatus = 'PENDING' | 'DONE' | 'SKIPPED';
export type ReminderSource = 'MANUAL' | 'PRESCRIPTION' | 'DOCTOR';

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
