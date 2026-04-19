import {
  InsuranceCoverageScope,
  InsuranceCoverageType,
} from '@prisma/client';

export interface SanadInsuranceCard {
  provider: string;
  providerAr: string;
  memberNumber: string;
  nationalId: string;
  holderName: string;
  coverageType: InsuranceCoverageType;
  coverageScope: InsuranceCoverageScope;
  validFrom: string;
  validUntil: string;
  photoUrl: string | null;
}

const PROVIDERS: Array<{
  name: string;
  nameAr: string;
  type: InsuranceCoverageType;
}> = [
  {
    name: 'Government Health Insurance',
    nameAr: 'التأمين الصحي الحكومي',
    type: InsuranceCoverageType.PUBLIC,
  },
  {
    name: 'Royal Medical Services',
    nameAr: 'الخدمات الطبية الملكية',
    type: InsuranceCoverageType.MILITARY,
  },
  {
    name: 'MetLife',
    nameAr: 'متلايف',
    type: InsuranceCoverageType.PRIVATE,
  },
];

// Deterministic mock — would be replaced with a JoPACC/Sanad civil-registry call
// returning the citizen's authoritative health insurance card by national ID.
export function fetchSanadInsuranceCard(
  seed: string,
  holderName: string,
): SanadInsuranceCard {
  const salt = hashString(seed);
  const provider = PROVIDERS[salt % PROVIDERS.length];
  const isFamily = (salt >> 3) % 2 === 0;
  const nationalId = String(9990000000 + (salt % 1_000_000)).padStart(10, '9');
  const memberSerial = String(100000 + (salt % 900000));
  const memberPrefix =
    provider.type === InsuranceCoverageType.PUBLIC
      ? 'GHI'
      : provider.type === InsuranceCoverageType.MILITARY
        ? 'RMS'
        : 'MET';
  const memberNumber = `${memberPrefix}-${memberSerial}`;
  const now = new Date();
  const validFrom = new Date(now.getFullYear() - 1, 0, 1);
  const validUntil = new Date(now.getFullYear() + 1, 11, 31);

  return {
    provider: provider.name,
    providerAr: provider.nameAr,
    memberNumber,
    nationalId,
    holderName,
    coverageType: provider.type,
    coverageScope: isFamily
      ? InsuranceCoverageScope.FAMILY
      : InsuranceCoverageScope.SELF_ONLY,
    validFrom: validFrom.toISOString().slice(0, 10),
    validUntil: validUntil.toISOString().slice(0, 10),
    photoUrl: null,
  };
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}
