import { Gender, PrismaClient } from '@prisma/client';

const PATIENT_EMAIL = 'sanad.user@hayat.jo';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: PATIENT_EMAIL } });
    if (!user) {
      console.error(`Patient ${PATIENT_EMAIL} not found`);
      process.exit(1);
    }

    const deleted = await prisma.familyMember.deleteMany({
      where: { guardianId: user.id },
    });
    console.log(`Removed ${deleted.count} existing family members`);

    const members = [
      {
        guardianId: user.id,
        fullName: 'Omar Al-Tahat',
        dateOfBirth: yearsAgoDate(7, 3, 14),
        gender: Gender.MALE,
        relationship: 'son',
        bloodType: 'A+',
        allergies: ['Penicillin', 'Peanuts'],
        conditions: ['Type 1 Diabetes', 'Severe Asthma'],
        needsUrgentCare: true,
        urgentCareNote:
          'Recent hypoglycemia episodes at school. Monitor blood sugar every 3 hours and keep fast-acting glucose available.',
      },
      {
        guardianId: user.id,
        fullName: 'Layla Al-Tahat',
        dateOfBirth: yearsAgoDate(10, 7, 2),
        gender: Gender.FEMALE,
        relationship: 'daughter',
        bloodType: 'O+',
        allergies: [],
        conditions: [],
        needsUrgentCare: false,
      },
      {
        guardianId: user.id,
        fullName: 'Fatima Al-Tahat',
        dateOfBirth: yearsAgoDate(68, 2, 9),
        gender: Gender.FEMALE,
        relationship: 'mother',
        bloodType: 'B+',
        allergies: [],
        conditions: ['Hypertension', 'Osteoarthritis'],
        needsUrgentCare: false,
      },
    ];

    const result = await prisma.familyMember.createMany({ data: members });
    console.log(`Created ${result.count} family members for ${PATIENT_EMAIL}`);
  } finally {
    await prisma.$disconnect();
  }
}

function yearsAgoDate(years: number, month: number, day: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
