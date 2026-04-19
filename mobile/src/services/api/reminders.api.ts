import { api } from './client';

export type ReminderType = 'MEDICATION' | 'APPOINTMENT' | 'CHECKUP' | 'OTHER';
export type ReminderStatus = 'PENDING' | 'DONE' | 'SKIPPED';
export type ReminderSource = 'MANUAL' | 'PRESCRIPTION';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  subtitle: string | null;
  scheduledAt: string;
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

export async function createReminder(payload: {
  type: ReminderType;
  title: string;
  subtitle?: string;
  scheduledAt: string;
  recurrence?: string;
}) {
  const { data } = await api.post<Reminder>('/reminders', payload);
  return data;
}

export async function updateReminder(
  id: string,
  payload: Partial<{
    type: ReminderType;
    title: string;
    subtitle: string;
    scheduledAt: string;
    recurrence: string;
    status: ReminderStatus;
  }>,
) {
  const { data } = await api.patch<Reminder>(`/reminders/${id}`, payload);
  return data;
}

export async function deleteReminder(id: string) {
  await api.delete(`/reminders/${id}`);
}
