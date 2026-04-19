import { api } from './client';

export interface Department {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
}

export interface Hospital {
  id: string;
  nameAr: string;
  nameEn: string;
  city: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  isGovernment: boolean;
  departments: Department[];
  distanceKm?: number;
}

export async function listHospitals(params?: { lat?: number; lng?: number; city?: string }) {
  const { data } = await api.get<Hospital[]>('/hospitals', { params });
  return data;
}

export async function getHospital(id: string) {
  const { data } = await api.get<Hospital>(`/hospitals/${id}`);
  return data;
}

export interface BookableDoctor {
  id: string;
  specialty: string;
  specialtyAr: string | null;
  bio: string | null;
  isAvailable: boolean;
  rating: number | null;
  yearsExperience: number | null;
  user: { id: string; fullName: string | null; email: string };
}

export async function listDepartmentDoctors(
  hospitalId: string,
  departmentId: string,
) {
  const { data } = await api.get<BookableDoctor[]>(
    `/hospitals/${hospitalId}/departments/${departmentId}/doctors`,
  );
  return data;
}
