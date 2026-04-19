import { api } from './client';

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

export async function createVaccination(payload: {
  name: string;
  manufacturer?: string;
  doseNumber?: number;
  totalDoses?: number;
  dateGiven: string;
  expiresAt?: string;
  batchNumber?: string;
  administeredBy?: string;
  administeredAt?: string;
  certificateNumber?: string;
  notes?: string;
}) {
  const { data } = await api.post<Vaccination>('/vaccinations', payload);
  return data;
}

export async function deleteVaccination(id: string) {
  await api.delete(`/vaccinations/${id}`);
}
