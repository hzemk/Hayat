import { api } from './client';

export interface SosContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export async function listSosContacts() {
  const { data } = await api.get<SosContact[]>('/sos-contacts');
  return data;
}

export async function createSosContact(payload: {
  name: string;
  phoneNumber: string;
  relationship?: string;
  priority?: number;
}) {
  const { data } = await api.post<SosContact>('/sos-contacts', payload);
  return data;
}

export async function updateSosContact(
  id: string,
  payload: Partial<{
    name: string;
    phoneNumber: string;
    relationship: string;
    priority: number;
  }>,
) {
  const { data } = await api.patch<SosContact>(`/sos-contacts/${id}`, payload);
  return data;
}

export async function deleteSosContact(id: string) {
  await api.delete(`/sos-contacts/${id}`);
}
