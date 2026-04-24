import { api } from './client';

export interface VaccineDoctor {
  id: string;
  specialty: string;
  specialtyAr: string | null;
  photoUrl: string | null;
  hospitalId: string | null;
  user: { fullName: string | null; email: string };
}

export interface VaccineHospital {
  id: string;
  nameAr: string;
  nameEn: string;
  city: string;
  phone: string | null;
}

export interface Vaccination {
  id: string;
  name: string;
  manufacturer: string | null;
  doseNumber: number | null;
  totalDoses: number | null;
  dateGiven: string;
  expiresAt: string | null;
  batchNumber: string | null;
  administeredBy: string | null;
  administeredAt: string | null;
  administeredByDoctorId: string | null;
  administeredAtHospitalId: string | null;
  administeredByDoctor: VaccineDoctor | null;
  administeredAtHospital: VaccineHospital | null;
  certificateNumber: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listVaccinations() {
  const { data } = await api.get<Vaccination[]>('/vaccinations');
  return data;
}

export async function getVaccination(id: string) {
  const { data } = await api.get<Vaccination>(`/vaccinations/${id}`);
  return data;
}

export interface VaccineShareToken {
  token: string;
  expiresAt: string;
  path: string;
}

export async function createVaccineShareToken(id: string) {
  const { data } = await api.post<VaccineShareToken>(
    `/vaccinations/${id}/share-token`,
  );
  return data;
}

// Builds the full public URL the QR code points to. Mirrors
// medicalIdShareUrl: combine the API base with the relative `v/<token>` so
// the same code works in dev (LAN IP) and prod.
export function vaccineShareUrl(path: string): string {
  const base = api.defaults.baseURL ?? '';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return new URL(path, normalizedBase).toString();
}
