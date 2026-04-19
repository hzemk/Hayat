import { api } from './client';
import type { User } from '@stores/auth';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
}

export type Session = AuthTokens & { user: User };

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  preferredLocale?: string;
  role?: 'PATIENT' | 'DOCTOR';
  doctorProfile?: {
    licenseNumber: string;
    specialty: string;
    specialtyAr?: string;
  };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function registerAccount(payload: RegisterPayload) {
  const { data } = await api.post<Session>('/auth/register', payload);
  return data;
}

export async function loginWithEmail(payload: LoginPayload) {
  const { data } = await api.post<Session>('/auth/login', payload);
  return data;
}

export async function loginWithSanad(code: string, state?: string) {
  const { data } = await api.post<Session>('/auth/sanad/callback', {
    code,
    state,
  });
  return data;
}

export async function refreshSession(refreshToken: string) {
  const { data } = await api.post<AuthTokens>('/auth/refresh', { refreshToken });
  return data;
}

// Mobile-side helper: produces a stub Sanad auth-code that the backend mock accepts.
// TODO: replace with real JoPACC / Sanad OIDC redirect flow once credentials are provisioned.
export function buildMockSanadCode(opts: {
  subject: string;
  email: string;
  fullName: string;
}) {
  return `sanad-mock:${opts.subject}:${opts.email}:${encodeURIComponent(opts.fullName)}`;
}
