import { api } from './client';

export type InsuranceCoverageType = 'PUBLIC' | 'MILITARY' | 'PRIVATE';
export type InsuranceCoverageScope = 'SELF_ONLY' | 'FAMILY';
export type InsuranceCardSource = 'SANAD' | 'HOSPITAL' | 'ADMIN';

export interface InsuranceCard {
  id: string;
  userId: string;
  provider: string;
  providerAr: string | null;
  memberNumber: string;
  nationalId: string;
  holderName: string;
  coverageType: InsuranceCoverageType;
  coverageScope: InsuranceCoverageScope;
  validFrom: string;
  validUntil: string;
  photoUrl: string | null;
  source: InsuranceCardSource;
  issuedByHospitalId: string | null;
  issuedByHospital?: {
    id: string;
    nameAr: string;
    nameEn: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export async function getInsuranceCard() {
  const { data } = await api.get<InsuranceCard | null>('/insurance-card');
  return data;
}

export async function syncInsuranceFromSanad() {
  const { data } = await api.post<InsuranceCard>('/insurance-card/sync-sanad');
  return data;
}
