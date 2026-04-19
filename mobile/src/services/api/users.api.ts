import { api } from './client';
import type { User } from '@stores/auth';

export async function getMe() {
  const { data } = await api.get<User>('/users/me');
  return data;
}

export interface UpdateProfilePayload {
  fullName?: string;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE';
  phoneNumber?: string;
  preferredLocale?: 'ar' | 'en';
}

export async function updateMe(payload: UpdateProfilePayload) {
  const { data } = await api.patch<User>('/users/me', payload);
  return data;
}

export async function updateMyPushToken(expoPushToken: string | null) {
  await api.patch('/users/me/push-token', { expoPushToken });
}
