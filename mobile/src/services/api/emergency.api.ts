import { api } from './client';

export interface EmergencyResponse {
  id: string;
  requestedAt: string;
  status: string;
  nearestHospital: {
    id: string;
    nameAr: string;
    nameEn: string;
    phone: string | null;
  } | null;
  instructions: { ar: string; en: string };
}

export async function requestEmergency(payload: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  note?: string;
}) {
  const { data } = await api.post<EmergencyResponse>('/emergency/request', payload);
  return data;
}
