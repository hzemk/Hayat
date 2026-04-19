import { api } from './client';

export type DoctorMessageSender = 'PATIENT' | 'DOCTOR' | 'SYSTEM';
export type DoctorMessageKind =
  | 'TEXT'
  | 'SYMPTOM_SUMMARY'
  | 'RX_REQUEST'
  | 'RX_ISSUED'
  | 'SYSTEM';

export interface DoctorSummary {
  id: string;
  licenseNumber: string;
  specialty: string;
  specialtyAr: string | null;
  bio: string | null;
  bioAr: string | null;
  photoUrl: string | null;
  yearsExperience: number | null;
  languages: string[];
  rating: number | null;
  isAvailable: boolean;
  user: { id: string; fullName: string | null; email: string };
  hospital: { id: string; nameAr: string; nameEn: string } | null;
  department: {
    id: string;
    nameAr: string;
    nameEn: string;
    code: string;
  } | null;
}

export interface DoctorMessage {
  id: string;
  threadId: string;
  sender: DoctorMessageSender;
  kind: DoctorMessageKind;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface DoctorThread {
  id: string;
  patientId: string;
  doctorId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

export interface DoctorThreadWithDoctor extends DoctorThread {
  doctor: DoctorSummary;
  messages: DoctorMessage[];
}

export interface MessagesResponse {
  thread: DoctorThread;
  messages: DoctorMessage[];
}

export async function listDoctors() {
  const { data } = await api.get<DoctorSummary[]>('/doctors');
  return data;
}

export async function getDoctor(id: string) {
  const { data } = await api.get<DoctorSummary>(`/doctors/${id}`);
  return data;
}

export async function selectDefaultDoctor(id: string) {
  const { data } = await api.post<{ ok: boolean; defaultDoctorId: string }>(
    `/doctors/${id}/select`,
  );
  return data;
}

export async function listMyThreads() {
  const { data } = await api.get<DoctorThreadWithDoctor[]>('/doctor-threads');
  return data;
}

export async function getUnreadCount() {
  const { data } = await api.get<{ count: number }>(
    '/doctor-threads/unread-count',
  );
  return data.count;
}

export async function listMessages(doctorId: string) {
  const { data } = await api.get<MessagesResponse>(
    `/doctor-threads/${doctorId}/messages`,
  );
  return data;
}

export async function sendMessage(
  doctorId: string,
  payload: {
    body: string;
    kind?: DoctorMessageKind;
    metadata?: Record<string, unknown>;
  },
) {
  const { data } = await api.post<DoctorMessage>(
    `/doctor-threads/${doctorId}/messages`,
    payload,
  );
  return data;
}

export async function markMessageRead(doctorId: string, messageId: string) {
  const { data } = await api.post<DoctorMessage>(
    `/doctor-threads/${doctorId}/messages/${messageId}/read`,
  );
  return data;
}

export interface DoctorRating {
  id: string;
  doctorId: string;
  patientId: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getMyDoctorRating(doctorId: string) {
  const { data } = await api.get<DoctorRating | null>(
    `/doctor-threads/${doctorId}/rating`,
  );
  return data;
}

export async function rateDoctor(
  doctorId: string,
  payload: { stars: number; comment?: string },
) {
  const { data } = await api.post<{
    rating: DoctorRating;
    average: number | null;
    count: number;
  }>(`/doctor-threads/${doctorId}/rating`, payload);
  return data;
}
