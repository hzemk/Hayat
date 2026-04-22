import { api } from './client';

export interface HospitalMe {
  id: string;
  nameAr: string;
  nameEn: string;
  city: string;
  phone: string | null;
  addressAr: string | null;
  addressEn: string | null;
  latitude: number;
  longitude: number;
  isGovernment: boolean;
  departments: Array<{
    id: string;
    nameAr: string;
    nameEn: string;
    code: string;
  }>;
}

export interface HospitalStats {
  hospital: {
    id: string;
    nameAr: string;
    nameEn: string;
    city: string;
    phone: string | null;
  };
  doctors: number;
  onlineDoctors: number;
  departments: number;
  openAppointments: number;
  unreadMessages: number;
}

export interface HospitalDoctorRow {
  id: string;
  licenseNumber: string;
  specialty: string;
  specialtyAr: string | null;
  rating: number | null;
  isAvailable: boolean;
  yearsExperience: number | null;
  photoUrl: string | null;
  languages: string[];
  user: {
    id: string;
    fullName: string | null;
    email: string;
    phoneNumber: string | null;
  };
  department: { id: string; nameAr: string; nameEn: string } | null;
  threadCount: number;
  unreadMessages: number;
}

export interface HospitalDepartmentRow {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  doctorCount: number;
  onlineCount: number;
}

export async function getHospitalMe(): Promise<HospitalMe> {
  const { data } = await api.get('/hospital-portal/me');
  return data;
}

export async function getHospitalStats(): Promise<HospitalStats> {
  const { data } = await api.get('/hospital-portal/stats');
  return data;
}

export async function listHospitalDoctors(): Promise<HospitalDoctorRow[]> {
  const { data } = await api.get('/hospital-portal/doctors');
  return data;
}

export async function listHospitalDepartments(): Promise<
  HospitalDepartmentRow[]
> {
  const { data } = await api.get('/hospital-portal/departments');
  return data;
}

export async function setHospitalDoctorAvailability(
  doctorId: string,
  isAvailable: boolean,
) {
  const { data } = await api.patch(
    `/hospital-portal/doctors/${doctorId}/availability`,
    { isAvailable },
  );
  return data;
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAYS: Weekday[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

export interface DayWindow {
  day: Weekday;
  open: string | null;
  close: string | null;
}

export interface HospitalDepartmentDetail {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  openHours: DayWindow[];
  doctors: Array<{
    id: string;
    specialty: string;
    specialtyAr: string | null;
    isAvailable: boolean;
    photoUrl: string | null;
    user: { id: string; fullName: string | null; email: string };
  }>;
}

export interface CreateHospitalDoctorPayload {
  email: string;
  fullName: string;
  licenseNumber: string;
  specialty: string;
  specialtyAr?: string;
  departmentId?: string;
  phoneNumber?: string;
  yearsExperience?: number;
  languages?: string[];
  password?: string;
}

export interface CreatedHospitalDoctor {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  tempPassword: string | null;
}

export async function createHospitalDoctor(
  payload: CreateHospitalDoctorPayload,
): Promise<CreatedHospitalDoctor> {
  const { data } = await api.post('/hospital-portal/doctors', payload);
  return data;
}

export interface CreateDepartmentPayload {
  nameEn: string;
  nameAr: string;
  code?: string;
  openHours?: DayWindow[];
}

export async function createHospitalDepartment(
  payload: CreateDepartmentPayload,
): Promise<HospitalDepartmentRow> {
  const { data } = await api.post('/hospital-portal/departments', payload);
  return data;
}

export async function getHospitalDepartment(
  departmentId: string,
): Promise<HospitalDepartmentDetail> {
  const { data } = await api.get(
    `/hospital-portal/departments/${departmentId}`,
  );
  return data;
}

export async function updateHospitalDepartment(
  departmentId: string,
  payload: { nameEn?: string; nameAr?: string; openHours?: DayWindow[] },
): Promise<HospitalDepartmentDetail> {
  const { data } = await api.patch(
    `/hospital-portal/departments/${departmentId}`,
    payload,
  );
  return data;
}

export interface RosterPatient {
  id: string;
  threadId: string;
  fullName: string | null;
  email: string;
  phoneNumber: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  dateOfBirth: string | null;
  lastMessageAt: string | null;
  unread: number;
}

export interface RosterDoctor {
  id: string;
  specialty: string;
  specialtyAr: string | null;
  isAvailable: boolean;
  photoUrl: string | null;
  user: { id: string; fullName: string | null; email: string };
  patientCount: number;
  patients: RosterPatient[];
}

export interface DepartmentRoster {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  doctors: RosterDoctor[];
}

export async function getDepartmentRoster(
  departmentId: string,
): Promise<DepartmentRoster> {
  const { data } = await api.get(
    `/hospital-portal/departments/${departmentId}/roster`,
  );
  return data;
}

export interface PatientCareCondition {
  id: string;
  name: string;
  status: string;
  notes: string | null;
  diagnosedAt: string | null;
}

export interface PatientCareAllergy {
  id: string;
  substance: string;
  severity: string | null;
  reaction: string | null;
}

export interface PatientCareMedication {
  id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  notes: string | null;
}

export interface PatientCarePrescriptionItem {
  id: string;
  medicationName: string;
  dose: string;
  frequency: string;
  durationDays: number | null;
  instructionsAr: string | null;
  instructionsEn: string | null;
}

export interface PatientCarePrescription {
  id: string;
  status: string;
  notes: string | null;
  issuedAt: string;
  expiresAt: string | null;
  items: PatientCarePrescriptionItem[];
}

export interface PatientCare {
  doctor: {
    id: string;
    fullName: string | null;
    specialty: string;
    specialtyAr: string | null;
  };
  patient: {
    id: string;
    fullName: string | null;
    email: string;
    phoneNumber: string | null;
    dateOfBirth: string | null;
    gender: 'MALE' | 'FEMALE' | null;
    bloodType: string | null;
  };
  conditions: PatientCareCondition[];
  allergies: PatientCareAllergy[];
  medications: PatientCareMedication[];
  latestSymptom: {
    body: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
  } | null;
  prescriptions: PatientCarePrescription[];
}

export async function getPatientCare(
  doctorId: string,
  patientId: string,
): Promise<PatientCare> {
  const { data } = await api.get(
    `/hospital-portal/doctors/${doctorId}/patients/${patientId}/care`,
  );
  return data;
}
