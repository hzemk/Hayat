import { api } from './client';

export interface Condition {
  id: string;
  name: string;
  status: string;
  notes: string | null;
  diagnosedAt: string | null;
  icdCode?: string | null;
}

export interface Medication {
  id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  notes: string | null;
}

export interface Allergy {
  id: string;
  substance: string;
  severity: string | null;
  reaction: string | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
}

export interface MedicalRecord {
  id: string;
  bloodType: string | null;
  heightCm: number | null;
  weightKg: number | null;
  conditions: Condition[];
  medications: Medication[];
  allergies: Allergy[];
  emergencyContacts: EmergencyContact[];
}

export interface UpdateMedicalRecordPayload {
  bloodType?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
}

export interface AllergyPayload {
  substance?: string;
  severity?: string | null;
  reaction?: string | null;
}

export interface ConditionPayload {
  name?: string;
  status?: string;
  icdCode?: string | null;
  diagnosedAt?: string | null;
  notes?: string | null;
}

export interface MedicationPayload {
  name?: string;
  dose?: string | null;
  frequency?: string | null;
  notes?: string | null;
}

export interface EmergencyContactPayload {
  name?: string;
  relationship?: string;
  phoneNumber?: string;
}

export async function getMyMedicalRecord() {
  const { data } = await api.get<MedicalRecord>('/medical-record/me');
  return data;
}

export interface MedicalIdShareToken {
  token: string;
  expiresAt: string;
  path: string;
}

export async function createMedicalIdShareToken() {
  const { data } = await api.post<MedicalIdShareToken>(
    '/medical-record/me/share-token',
  );
  return data;
}

// Builds the full public URL a paramedic would open from the QR code.
// The backend returns a relative path like `m/<token>`; we combine it with
// the API origin so the same URL works in dev (localhost) and prod.
export function medicalIdShareUrl(path: string): string {
  const base = api.defaults.baseURL ?? '';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return new URL(path, normalizedBase).toString();
}

export async function updateMyMedicalRecord(payload: UpdateMedicalRecordPayload) {
  const { data } = await api.patch<MedicalRecord>('/medical-record/me', payload);
  return data;
}

// allergies
export async function createAllergy(payload: AllergyPayload) {
  const { data } = await api.post<MedicalRecord>(
    '/medical-record/me/allergies',
    payload,
  );
  return data;
}
export async function updateAllergy(id: string, payload: AllergyPayload) {
  const { data } = await api.patch<MedicalRecord>(
    `/medical-record/me/allergies/${id}`,
    payload,
  );
  return data;
}
export async function deleteAllergy(id: string) {
  const { data } = await api.delete<MedicalRecord>(
    `/medical-record/me/allergies/${id}`,
  );
  return data;
}

// conditions
export async function createCondition(payload: ConditionPayload) {
  const { data } = await api.post<MedicalRecord>(
    '/medical-record/me/conditions',
    payload,
  );
  return data;
}
export async function updateCondition(id: string, payload: ConditionPayload) {
  const { data } = await api.patch<MedicalRecord>(
    `/medical-record/me/conditions/${id}`,
    payload,
  );
  return data;
}
export async function deleteCondition(id: string) {
  const { data } = await api.delete<MedicalRecord>(
    `/medical-record/me/conditions/${id}`,
  );
  return data;
}

// medications
export async function createMedication(payload: MedicationPayload) {
  const { data } = await api.post<MedicalRecord>(
    '/medical-record/me/medications',
    payload,
  );
  return data;
}
export async function updateMedication(id: string, payload: MedicationPayload) {
  const { data } = await api.patch<MedicalRecord>(
    `/medical-record/me/medications/${id}`,
    payload,
  );
  return data;
}
export async function deleteMedication(id: string) {
  const { data } = await api.delete<MedicalRecord>(
    `/medical-record/me/medications/${id}`,
  );
  return data;
}

// emergency contacts
export async function createEmergencyContact(payload: EmergencyContactPayload) {
  const { data } = await api.post<MedicalRecord>(
    '/medical-record/me/emergency-contacts',
    payload,
  );
  return data;
}
export async function updateEmergencyContact(
  id: string,
  payload: EmergencyContactPayload,
) {
  const { data } = await api.patch<MedicalRecord>(
    `/medical-record/me/emergency-contacts/${id}`,
    payload,
  );
  return data;
}
export async function deleteEmergencyContact(id: string) {
  const { data } = await api.delete<MedicalRecord>(
    `/medical-record/me/emergency-contacts/${id}`,
  );
  return data;
}
