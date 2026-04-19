import { api } from './client';
import { Reminder, ReminderType } from './reminders.api';

export type Gender = 'MALE' | 'FEMALE';

export interface FamilyMedication {
  id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  notes: string | null;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  guardianId: string;
  sanadSubject: string | null;
  nationalId: string | null;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  relationship: string;
  bloodType: string | null;
  allergies: string[];
  conditions: string[];
  needsUrgentCare: boolean;
  urgentCareNote: string | null;
  medications: FamilyMedication[];
  reminders?: Reminder[];
  createdAt: string;
  updatedAt: string;
}

export async function listFamilyMembers() {
  const { data } = await api.get<FamilyMember[]>('/family/members');
  return data;
}

export async function getFamilyMember(id: string) {
  const { data } = await api.get<FamilyMember>(`/family/members/${id}`);
  return data;
}

export async function syncFromSanad() {
  const { data } = await api.post<{ synced: number; members: FamilyMember[] }>(
    '/family/sync',
  );
  return data;
}

export async function createFamilyMember(payload: {
  fullName: string;
  dateOfBirth: string;
  gender?: Gender;
  relationship?: string;
  nationalId?: string;
  bloodType?: string;
  allergies?: string[];
  conditions?: string[];
  needsUrgentCare?: boolean;
  urgentCareNote?: string;
}) {
  const { data } = await api.post<FamilyMember>('/family/members', payload);
  return data;
}

export async function updateFamilyMember(
  id: string,
  payload: Partial<{
    fullName: string;
    dateOfBirth: string;
    gender: Gender;
    relationship: string;
    bloodType: string;
    allergies: string[];
    conditions: string[];
    needsUrgentCare: boolean;
    urgentCareNote: string;
  }>,
) {
  const { data } = await api.patch<FamilyMember>(
    `/family/members/${id}`,
    payload,
  );
  return data;
}

export async function deleteFamilyMember(id: string) {
  await api.delete(`/family/members/${id}`);
}

export async function addFamilyMedication(
  memberId: string,
  payload: { name: string; dose?: string; frequency?: string; notes?: string },
) {
  const { data } = await api.post<FamilyMedication>(
    `/family/members/${memberId}/medications`,
    payload,
  );
  return data;
}

export async function listFamilyReminders(
  memberId: string,
  scope: 'upcoming' | 'all' = 'upcoming',
) {
  const { data } = await api.get<Reminder[]>(
    `/family/members/${memberId}/reminders`,
    { params: { scope } },
  );
  return data;
}

export async function createFamilyReminder(
  memberId: string,
  payload: {
    type: ReminderType;
    title: string;
    subtitle?: string;
    scheduledAt: string;
    recurrence?: string;
  },
) {
  const { data } = await api.post<Reminder>(
    `/family/members/${memberId}/reminders`,
    payload,
  );
  return data;
}

export async function markFamilyReminderDone(
  memberId: string,
  reminderId: string,
) {
  const { data } = await api.patch<Reminder>(
    `/family/members/${memberId}/reminders/${reminderId}/done`,
  );
  return data;
}
