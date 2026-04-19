import { api } from './client';

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export interface AppointmentDoctor {
  id: string;
  specialty: string;
  specialtyAr: string | null;
  user: { id: string; fullName: string | null; email: string };
}

export interface Appointment {
  id: string;
  scheduledAt: string;
  status: AppointmentStatus;
  reason: string | null;
  hospital: { id: string; nameAr: string; nameEn: string; city?: string };
  department: { id: string; nameAr: string; nameEn: string };
  doctor: AppointmentDoctor | null;
}

export async function listAppointments() {
  const { data } = await api.get<Appointment[]>('/appointments');
  return data;
}

export async function createAppointment(payload: {
  hospitalId: string;
  departmentId: string;
  doctorId?: string;
  scheduledAt: string;
  reason?: string;
}) {
  const { data } = await api.post<Appointment>('/appointments', payload);
  return data;
}

export async function cancelAppointment(id: string) {
  const { data } = await api.delete<Appointment>(`/appointments/${id}`);
  return data;
}
