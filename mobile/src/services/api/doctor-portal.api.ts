import { api } from './client';

export interface DoctorMe {
  id: string;
  userId: string;
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
  user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    preferredLocale: string;
  };
  hospital: { id: string; nameAr: string; nameEn: string } | null;
  department: { id: string; nameAr: string; nameEn: string } | null;
}

export interface DoctorPatientRow {
  threadId: string;
  lastMessageAt: string | null;
  unread: number;
  patient: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    dateOfBirth: string | null;
    gender: 'MALE' | 'FEMALE' | null;
  };
}

export type DoctorMessageKind =
  | 'TEXT'
  | 'SYMPTOM_SUMMARY'
  | 'RX_REQUEST'
  | 'RX_ISSUED'
  | 'SYSTEM';

export interface DoctorMessage {
  id: string;
  threadId: string;
  sender: 'PATIENT' | 'DOCTOR' | 'SYSTEM';
  kind: DoctorMessageKind;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface DoctorThreadRow {
  id: string;
  patient: {
    id: string;
    fullName: string;
    phoneNumber: string | null;
  };
  lastMessage: DoctorMessage | null;
  lastMessageAt: string | null;
  unread: number;
}

export interface DoctorThreadDetail {
  id: string;
  patientId: string;
  doctorId: string;
  lastMessageAt: string | null;
  createdAt: string;
}

export async function getDoctorMe() {
  const { data } = await api.get<DoctorMe>('/doctor/me');
  return data;
}

export async function setDoctorAvailability(isAvailable: boolean) {
  const { data } = await api.patch<DoctorMe>('/doctor/me/availability', {
    isAvailable,
  });
  return data;
}

export async function listDoctorPatients() {
  const { data } = await api.get<DoctorPatientRow[]>('/doctor/patients');
  return data;
}

export async function listDoctorThreads() {
  const { data } = await api.get<DoctorThreadRow[]>('/doctor/threads');
  return data;
}

export async function getDoctorThread(patientId: string) {
  const { data } = await api.get<{
    thread: DoctorThreadDetail;
    messages: DoctorMessage[];
  }>(`/doctor/threads/${patientId}/messages`);
  return data;
}

export interface DoctorPatientDetail {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  preferredLocale: string;
}

export async function getDoctorPatient(patientId: string) {
  const { data } = await api.get<DoctorPatientDetail>(
    `/doctor/patients/${patientId}`,
  );
  return data;
}

export interface IssueRxItem {
  medicationName: string;
  dose: string;
  frequency: string;
  durationDays?: number;
  instructionsAr?: string;
  instructionsEn?: string;
}

export interface IssueRxPayload {
  patientId: string;
  notes?: string;
  items: IssueRxItem[];
}

export interface IssuedPrescription {
  id: string;
  patientId: string;
  status: string;
  notes: string | null;
  issuedAt: string;
  items: Array<{
    id: string;
    medicationName: string;
    dose: string;
    frequency: string;
    durationDays: number | null;
    instructionsAr: string | null;
    instructionsEn: string | null;
  }>;
  patient?: { id: string; fullName: string };
}

export async function issuePrescription(payload: IssueRxPayload) {
  const { data } = await api.post<IssuedPrescription>(
    '/doctor/prescriptions',
    payload,
  );
  return data;
}

export async function listIssuedPrescriptions() {
  const { data } = await api.get<IssuedPrescription[]>('/doctor/prescriptions');
  return data;
}

export async function sendDoctorMessageToPatient(
  patientId: string,
  body: { body: string; kind?: DoctorMessageKind },
) {
  const { data } = await api.post<DoctorMessage>(
    `/doctor/threads/${patientId}/messages`,
    body,
  );
  return data;
}
