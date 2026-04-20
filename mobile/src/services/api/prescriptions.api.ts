import { api } from './client';

export interface PrescriptionItem {
  id: string;
  medicationName: string;
  dose: string;
  frequency: string;
  durationDays: number | null;
  instructionsAr: string | null;
  instructionsEn: string | null;
}

export type PrescriptionSource = 'DOCTOR' | 'SCAN';

export interface Prescription {
  id: string;
  issuedAt: string;
  expiresAt: string | null;
  status: 'ACTIVE' | 'DISPENSED' | 'CANCELLED' | 'EXPIRED';
  notes: string | null;
  items: PrescriptionItem[];
  source: PrescriptionSource;
  doctorUser: { fullName: string | null };
}

export async function listPrescriptions() {
  const { data } = await api.get<Prescription[]>('/prescriptions');
  return data;
}

export async function getPrescription(id: string) {
  const { data } = await api.get<Prescription>(`/prescriptions/${id}`);
  return data;
}

export interface ScannedItem {
  medicationName: string;
  dose: string;
  frequency: string;
  durationDays?: number;
  instructionsEn?: string;
  instructionsAr?: string;
}

export interface ScanResult {
  notes?: string;
  items: ScannedItem[];
}

export async function scanPrescription(payload: {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}) {
  const { data } = await api.post<ScanResult>('/prescriptions/scan', payload);
  return data;
}

export async function createPrescription(payload: {
  notes?: string;
  items: ScannedItem[];
}) {
  const { data } = await api.post<Prescription>('/prescriptions', payload);
  return data;
}
