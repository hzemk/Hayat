import { Gender } from '@prisma/client';

export interface SanadDependent {
  sanadSubject: string;
  nationalId: string;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  relationship: string;
}

// Deterministic mock. In production this would be a JoPACC/Sanad civil-registry call
// that returns the authenticated citizen's dependents (children under 18) by national ID.
export function fetchSanadDependents(
  guardianSanadId: string,
): SanadDependent[] {
  const salt = hashString(guardianSanadId);
  const count = (salt % 3) + 1;
  const year = new Date().getFullYear();
  const firstNamesBoys = ['Omar', 'Yousef', 'Khalid', 'Zaid', 'Adam'];
  const firstNamesGirls = ['Layla', 'Maryam', 'Noor', 'Salma', 'Jana'];
  const results: SanadDependent[] = [];

  for (let i = 0; i < count; i++) {
    const seed = salt + i * 7919;
    const isGirl = seed % 2 === 0;
    const pool = isGirl ? firstNamesGirls : firstNamesBoys;
    const name = pool[seed % pool.length];
    const age = (seed % 14) + 2;
    const dobYear = year - age;
    const dobMonth = ((seed >> 3) % 12) + 1;
    const dobDay = ((seed >> 5) % 27) + 1;
    const nat = String(9990000000 + (seed % 1_000_000)).padStart(10, '9');

    results.push({
      sanadSubject: `${guardianSanadId}-dep-${i + 1}`,
      nationalId: nat,
      fullName: name,
      dateOfBirth: `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`,
      gender: isGirl ? Gender.FEMALE : Gender.MALE,
      relationship: isGirl ? 'daughter' : 'son',
    });
  }

  return results;
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}
