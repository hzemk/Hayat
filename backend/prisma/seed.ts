import {
  AppointmentStatus,
  AuthProvider,
  DoctorMessageKind,
  DoctorMessageSender,
  Gender,
  InsuranceCardSource,
  InsuranceCoverageScope,
  InsuranceCoverageType,
  PrescriptionStatus,
  PrismaClient,
  ReminderStatus,
  ReminderType,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const HOSPITALS = [
  {
    slug: 'juh',
    adminFullName: 'Jordan University Hospital — Admin',
    nameAr: 'مستشفى الجامعة الأردنية',
    nameEn: 'Jordan University Hospital',
    city: 'Amman',
    phone: '+96265353444',
    addressAr: 'الجبيهة، عمّان',
    addressEn: 'Al-Jubaiha, Amman',
    latitude: 31.9792,
    longitude: 35.8703,
    isGovernment: true,
  },
  {
    slug: 'bashir',
    adminFullName: 'Al-Bashir Hospital — Admin',
    nameAr: 'مستشفى البشير',
    nameEn: 'Al-Bashir Hospital',
    city: 'Amman',
    phone: '+96264775111',
    addressAr: 'الأشرفية، عمّان',
    addressEn: 'Ashrafieh, Amman',
    latitude: 31.9321,
    longitude: 35.9424,
    isGovernment: true,
  },
  {
    slug: 'queenrania',
    adminFullName: 'Queen Rania Children Hospital — Admin',
    nameAr: 'مستشفى الملكة رانيا العبدالله للأطفال',
    nameEn: 'Queen Rania Al Abdullah Hospital for Children',
    city: 'Amman',
    phone: '+96265353444',
    addressAr: 'الجامعة الأردنية، عمّان',
    addressEn: 'University of Jordan, Amman',
    latitude: 31.9783,
    longitude: 35.8704,
    isGovernment: true,
  },
  {
    slug: 'kauh',
    adminFullName: 'King Abdullah University Hospital — Admin',
    nameAr: 'مستشفى الملك المؤسس عبدالله الجامعي',
    nameEn: 'King Abdullah University Hospital',
    city: 'Irbid',
    phone: '+96227200600',
    addressAr: 'الرمثا، إربد',
    addressEn: 'Ar-Ramtha, Irbid',
    latitude: 32.4842,
    longitude: 35.9864,
    isGovernment: true,
  },
  {
    slug: 'hamza',
    adminFullName: 'Prince Hamza Hospital — Admin',
    nameAr: 'مستشفى الأمير حمزة',
    nameEn: 'Prince Hamza Hospital',
    city: 'Amman',
    phone: '+96265056000',
    addressAr: 'طبربور، عمّان',
    addressEn: 'Tabarbour, Amman',
    latitude: 32.0189,
    longitude: 35.9312,
    isGovernment: true,
  },
  {
    slug: 'israa',
    adminFullName: 'Al-Israa Hospital — Admin',
    nameAr: 'مستشفى الإسراء',
    nameEn: 'Al-Israa Hospital',
    city: 'Amman',
    phone: '+96265802900',
    addressAr: 'شارع المدينة المنورة، عمّان',
    addressEn: 'Al-Madina Al-Munawwara St, Amman',
    latitude: 31.9699,
    longitude: 35.8519,
    isGovernment: false,
  },
];

const HOSPITAL_ADMIN_PASSWORD = 'hospital1234';

const DEPARTMENTS = [
  { code: 'ER', nameAr: 'الطوارئ', nameEn: 'Emergency' },
  { code: 'CARDIO', nameAr: 'أمراض القلب', nameEn: 'Cardiology' },
  { code: 'PEDIA', nameAr: 'الأطفال', nameEn: 'Pediatrics' },
  { code: 'INTMED', nameAr: 'الباطنية', nameEn: 'Internal Medicine' },
  { code: 'OBGYN', nameAr: 'النسائية والتوليد', nameEn: 'OB/GYN' },
  { code: 'ORTHO', nameAr: 'جراحة العظام', nameEn: 'Orthopedics' },
  { code: 'DERM', nameAr: 'الجلدية', nameEn: 'Dermatology' },
  { code: 'ENT', nameAr: 'الأنف والأذن والحنجرة', nameEn: 'ENT' },
];

const DEMO_EMAIL = 'ahmed@hayat.jo';
const DEMO_PASSWORD = 'hayat1234';

async function seedHospitals() {
  console.log('Seeding hospitals + departments...');
  const created: { id: string; nameEn: string; slug: string }[] = [];
  for (const h of HOSPITALS) {
    const { slug: _slug, adminFullName: _adminName, ...hospitalData } = h;
    const existing = await prisma.hospital.findFirst({
      where: { nameEn: hospitalData.nameEn },
    });
    const hospital = existing
      ? await prisma.hospital.update({
          where: { id: existing.id },
          data: hospitalData,
        })
      : await prisma.hospital.create({ data: hospitalData });

    for (const d of DEPARTMENTS) {
      await prisma.department.upsert({
        where: { hospitalId_code: { hospitalId: hospital.id, code: d.code } },
        update: d,
        create: { ...d, hospitalId: hospital.id },
      });
    }
    created.push({ id: hospital.id, nameEn: hospital.nameEn, slug: h.slug });
  }
  console.log(
    `Seeded ${HOSPITALS.length} hospitals × ${DEPARTMENTS.length} departments.`,
  );
  return created;
}

async function seedHospitalAdmins(
  hospitals: { id: string; nameEn: string; slug: string }[],
) {
  console.log('Seeding hospital admins...');
  const passwordHash = await bcrypt.hash(HOSPITAL_ADMIN_PASSWORD, 12);
  const credentials: { email: string; hospital: string }[] = [];

  for (const hosp of hospitals) {
    const meta = HOSPITALS.find((h) => h.nameEn === hosp.nameEn);
    if (!meta) continue;
    const email = `hosp.${hosp.slug}@hayat.jo`;

    await prisma.user.upsert({
      where: { email },
      update: {
        fullName: meta.adminFullName,
        role: UserRole.HOSPITAL_ADMIN,
        hospitalId: hosp.id,
        passwordHash,
        emailVerified: true,
      },
      create: {
        email,
        passwordHash,
        authProvider: AuthProvider.LOCAL,
        emailVerified: true,
        fullName: meta.adminFullName,
        role: UserRole.HOSPITAL_ADMIN,
        hospitalId: hosp.id,
        preferredLocale: 'ar',
      },
    });

    credentials.push({ email, hospital: hosp.nameEn });
  }

  console.log(`Seeded ${credentials.length} hospital admins:`);
  for (const c of credentials) {
    console.log(`  → ${c.email} / ${HOSPITAL_ADMIN_PASSWORD}  (${c.hospital})`);
  }
  return credentials;
}

async function seedDemoUser(hospitals: { id: string; nameEn: string }[]) {
  console.log(`Seeding demo user ${DEMO_EMAIL}...`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      passwordHash,
      fullName: 'أحمد العلي',
      phoneNumber: '+962791234567',
      emailVerified: true,
    },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      authProvider: AuthProvider.LOCAL,
      emailVerified: true,
      fullName: 'أحمد العلي',
      phoneNumber: '+962791234567',
      dateOfBirth: new Date('1990-05-12'),
      gender: Gender.MALE,
      preferredLocale: 'ar',
    },
  });

  const record = await prisma.medicalRecord.upsert({
    where: { userId: user.id },
    update: { bloodType: 'O+', heightCm: 176, weightKg: 82 },
    create: {
      userId: user.id,
      bloodType: 'O+',
      heightCm: 176,
      weightKg: 82,
    },
  });

  // Wipe + recreate child records for idempotency
  await prisma.condition.deleteMany({ where: { medicalRecordId: record.id } });
  await prisma.allergy.deleteMany({ where: { medicalRecordId: record.id } });
  await prisma.medication.deleteMany({ where: { medicalRecordId: record.id } });
  await prisma.emergencyContact.deleteMany({
    where: { medicalRecordId: record.id },
  });

  await prisma.condition.createMany({
    data: [
      {
        medicalRecordId: record.id,
        name: 'Type 2 Diabetes',
        icdCode: 'E11',
        diagnosedAt: new Date('2020-03-10'),
        status: 'active',
      },
      {
        medicalRecordId: record.id,
        name: 'Hypertension',
        icdCode: 'I10',
        diagnosedAt: new Date('2021-08-22'),
        status: 'active',
      },
    ],
  });

  await prisma.allergy.createMany({
    data: [
      {
        medicalRecordId: record.id,
        substance: 'Penicillin',
        severity: 'severe',
        reaction: 'Rash, difficulty breathing',
      },
      {
        medicalRecordId: record.id,
        substance: 'Peanuts',
        severity: 'moderate',
        reaction: 'Hives',
      },
    ],
  });

  await prisma.medication.createMany({
    data: [
      {
        medicalRecordId: record.id,
        name: 'Metformin',
        dose: '500mg',
        frequency: 'Twice daily',
        startedAt: new Date('2020-03-10'),
      },
      {
        medicalRecordId: record.id,
        name: 'Lisinopril',
        dose: '10mg',
        frequency: 'Once daily',
        startedAt: new Date('2021-08-22'),
      },
    ],
  });

  await prisma.emergencyContact.create({
    data: {
      medicalRecordId: record.id,
      name: 'سارة العلي',
      relationship: 'Spouse',
      phoneNumber: '+962797654321',
    },
  });

  // Reminders
  await prisma.reminder.deleteMany({ where: { userId: user.id } });
  const now = new Date();
  const hoursFromNow = (h: number) =>
    new Date(now.getTime() + h * 60 * 60 * 1000);
  await prisma.reminder.createMany({
    data: [
      {
        userId: user.id,
        type: ReminderType.MEDICATION,
        title: 'Metformin 500mg',
        subtitle: 'After breakfast',
        scheduledAt: hoursFromNow(2),
        recurrence: 'daily',
        status: ReminderStatus.PENDING,
      },
      {
        userId: user.id,
        type: ReminderType.MEDICATION,
        title: 'Lisinopril 10mg',
        subtitle: 'Morning dose',
        scheduledAt: hoursFromNow(-1),
        recurrence: 'daily',
        status: ReminderStatus.DONE,
        completedAt: hoursFromNow(-1),
      },
      {
        userId: user.id,
        type: ReminderType.APPOINTMENT,
        title: 'Cardiology follow-up',
        subtitle: 'Jordan University Hospital',
        scheduledAt: hoursFromNow(48),
        status: ReminderStatus.PENDING,
      },
      {
        userId: user.id,
        type: ReminderType.CHECKUP,
        title: 'Blood glucose check',
        subtitle: 'Fasting',
        scheduledAt: hoursFromNow(20),
        recurrence: 'weekly',
        status: ReminderStatus.PENDING,
      },
    ],
  });

  // Upcoming appointment
  const juh = hospitals.find(
    (h) => h.nameEn === 'Jordan University Hospital',
  );
  if (juh) {
    const cardio = await prisma.department.findUnique({
      where: { hospitalId_code: { hospitalId: juh.id, code: 'CARDIO' } },
    });
    if (cardio) {
      await prisma.appointment.deleteMany({ where: { userId: user.id } });
      await prisma.appointment.create({
        data: {
          userId: user.id,
          hospitalId: juh.id,
          departmentId: cardio.id,
          scheduledAt: hoursFromNow(48),
          status: AppointmentStatus.CONFIRMED,
          reason: 'Follow-up for hypertension',
        },
      });
    }
  }

  // Prescriptions
  const daysFromNow = (d: number) =>
    new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  await prisma.prescription.deleteMany({ where: { patientId: user.id } });

  await prisma.prescription.create({
    data: {
      patientId: user.id,
      doctorUserId: user.id,
      issuedAt: daysFromNow(-2),
      expiresAt: daysFromNow(88),
      status: PrescriptionStatus.ACTIVE,
      notes: 'Chronic medications — diabetes & hypertension',
      items: {
        create: [
          {
            medicationName: 'Metformin',
            dose: '500mg',
            frequency: 'Twice daily',
            durationDays: 90,
            instructionsAr: 'بعد الإفطار والعشاء',
            instructionsEn: 'After breakfast and dinner',
          },
          {
            medicationName: 'Lisinopril',
            dose: '10mg',
            frequency: 'Once daily',
            durationDays: 90,
            instructionsAr: 'صباحاً',
            instructionsEn: 'Morning',
          },
        ],
      },
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: user.id,
      doctorUserId: user.id,
      issuedAt: daysFromNow(-18),
      expiresAt: daysFromNow(-4),
      status: PrescriptionStatus.DISPENSED,
      notes: 'Upper respiratory infection — 7 day course',
      items: {
        create: [
          {
            medicationName: 'Amoxicillin',
            dose: '500mg',
            frequency: 'Three times daily',
            durationDays: 7,
            instructionsAr: 'مع الطعام',
            instructionsEn: 'With food',
          },
          {
            medicationName: 'Paracetamol',
            dose: '500mg',
            frequency: 'Every 6 hours as needed',
            durationDays: 5,
            instructionsAr: 'عند الحاجة للحمى',
            instructionsEn: 'As needed for fever',
          },
        ],
      },
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: user.id,
      doctorUserId: user.id,
      issuedAt: daysFromNow(-65),
      expiresAt: daysFromNow(-35),
      status: PrescriptionStatus.EXPIRED,
      notes: 'Seasonal allergy management',
      items: {
        create: [
          {
            medicationName: 'Cetirizine',
            dose: '10mg',
            frequency: 'Once daily at night',
            durationDays: 30,
            instructionsAr: 'مساءً',
            instructionsEn: 'Evening',
          },
        ],
      },
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: user.id,
      doctorUserId: user.id,
      issuedAt: daysFromNow(-6),
      expiresAt: daysFromNow(84),
      status: PrescriptionStatus.ACTIVE,
      notes: 'Cholesterol & reflux management',
      items: {
        create: [
          {
            medicationName: 'Atorvastatin',
            dose: '20mg',
            frequency: 'Once daily at night',
            durationDays: 90,
            instructionsAr: 'مساءً قبل النوم',
            instructionsEn: 'At bedtime',
          },
          {
            medicationName: 'Omeprazole',
            dose: '20mg',
            frequency: 'Once daily before breakfast',
            durationDays: 30,
            instructionsAr: 'قبل الإفطار بـ30 دقيقة',
            instructionsEn: '30 min before breakfast',
          },
        ],
      },
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: user.id,
      doctorUserId: user.id,
      issuedAt: daysFromNow(-40),
      expiresAt: daysFromNow(-33),
      status: PrescriptionStatus.DISPENSED,
      notes: 'Bronchitis — short azithromycin course',
      items: {
        create: [
          {
            medicationName: 'Azithromycin',
            dose: '500mg',
            frequency: 'Once daily',
            durationDays: 5,
            instructionsAr: 'مع الطعام',
            instructionsEn: 'With food',
          },
          {
            medicationName: 'Salbutamol inhaler',
            dose: '100mcg',
            frequency: '2 puffs every 6 hours as needed',
            durationDays: 7,
            instructionsAr: 'عند ضيق التنفس',
            instructionsEn: 'As needed for shortness of breath',
          },
        ],
      },
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: user.id,
      doctorUserId: user.id,
      issuedAt: daysFromNow(-120),
      expiresAt: daysFromNow(-90),
      status: PrescriptionStatus.DISPENSED,
      notes: 'Post-operative pain management (knee arthroscopy)',
      items: {
        create: [
          {
            medicationName: 'Ibuprofen',
            dose: '400mg',
            frequency: 'Every 8 hours',
            durationDays: 10,
            instructionsAr: 'مع الطعام لتجنّب اضطراب المعدة',
            instructionsEn: 'With food to avoid stomach upset',
          },
          {
            medicationName: 'Tramadol',
            dose: '50mg',
            frequency: 'Every 6 hours as needed',
            durationDays: 5,
            instructionsAr: 'عند الحاجة للألم الشديد فقط',
            instructionsEn: 'Only as needed for severe pain',
          },
          {
            medicationName: 'Pantoprazole',
            dose: '40mg',
            frequency: 'Once daily',
            durationDays: 14,
            instructionsAr: 'صباحاً قبل الطعام',
            instructionsEn: 'Morning before food',
          },
        ],
      },
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: user.id,
      doctorUserId: user.id,
      issuedAt: daysFromNow(-9),
      status: PrescriptionStatus.CANCELLED,
      notes: 'Cancelled — patient reported allergy after first dose',
      items: {
        create: [
          {
            medicationName: 'Amoxicillin-Clavulanate',
            dose: '625mg',
            frequency: 'Twice daily',
            durationDays: 7,
            instructionsAr: 'توقف عن الأخذ — تحسّس',
            instructionsEn: 'Stopped — allergic reaction',
          },
        ],
      },
    },
  });

  await prisma.prescription.create({
    data: {
      patientId: user.id,
      doctorUserId: user.id,
      issuedAt: daysFromNow(-1),
      expiresAt: daysFromNow(6),
      status: PrescriptionStatus.ACTIVE,
      notes: 'Mild viral conjunctivitis — right eye',
      items: {
        create: [
          {
            medicationName: 'Chloramphenicol eye drops',
            dose: '0.5%',
            frequency: '1 drop every 4 hours',
            durationDays: 5,
            instructionsAr: 'في العين اليمنى فقط',
            instructionsEn: 'Right eye only',
          },
        ],
      },
    },
  });

  // Family members — children under Ahmed's guardianship
  await prisma.familyMember.deleteMany({ where: { guardianId: user.id } });

  const layla = await prisma.familyMember.create({
    data: {
      guardianId: user.id,
      fullName: 'ليلى العلي',
      dateOfBirth: new Date('2017-09-04'),
      gender: Gender.FEMALE,
      relationship: 'daughter',
      bloodType: 'A+',
      allergies: ['Peanuts'],
      conditions: ['Mild asthma'],
    },
  });

  await prisma.familyMedication.createMany({
    data: [
      {
        familyMemberId: layla.id,
        name: 'Ventolin inhaler',
        dose: '100mcg',
        frequency: '2 puffs as needed',
        notes: 'For wheezing episodes',
      },
      {
        familyMemberId: layla.id,
        name: 'Cetirizine syrup',
        dose: '5ml',
        frequency: 'Once daily at night',
        notes: 'Seasonal allergies',
      },
    ],
  });

  const omar = await prisma.familyMember.create({
    data: {
      guardianId: user.id,
      fullName: 'عمر العلي',
      dateOfBirth: new Date('2020-03-22'),
      gender: Gender.MALE,
      relationship: 'son',
      bloodType: 'O+',
      allergies: [],
      conditions: [],
      needsUrgentCare: true,
      urgentCareNote: 'High fever for 2 days — needs pediatric follow-up',
    },
  });

  await prisma.familyMedication.create({
    data: {
      familyMemberId: omar.id,
      name: 'Paracetamol suspension',
      dose: '7.5ml',
      frequency: 'Every 6 hours as needed for fever',
      notes: 'Weight-based dosing (15kg)',
    },
  });

  const yara = await prisma.familyMember.create({
    data: {
      guardianId: user.id,
      fullName: 'يارا العلي',
      dateOfBirth: new Date('2022-11-30'),
      gender: Gender.FEMALE,
      relationship: 'daughter',
      bloodType: 'A+',
      allergies: [],
      conditions: [],
    },
  });

  await prisma.reminder.createMany({
    data: [
      {
        userId: user.id,
        familyMemberId: layla.id,
        type: ReminderType.MEDICATION,
        title: 'Ventolin — Layla',
        subtitle: 'Evening dose',
        scheduledAt: hoursFromNow(6),
        recurrence: 'daily',
        status: ReminderStatus.PENDING,
      },
      {
        userId: user.id,
        familyMemberId: omar.id,
        type: ReminderType.MEDICATION,
        title: 'Paracetamol — Omar',
        subtitle: 'Every 6 hours',
        scheduledAt: hoursFromNow(4),
        status: ReminderStatus.PENDING,
      },
      {
        userId: user.id,
        familyMemberId: yara.id,
        type: ReminderType.CHECKUP,
        title: 'Yara — 18-month pediatric checkup',
        subtitle: 'Queen Rania Hospital for Children',
        scheduledAt: hoursFromNow(24 * 6),
        status: ReminderStatus.PENDING,
      },
    ],
  });

  // Vaccinations — useful for airport/travel display
  await prisma.vaccination.deleteMany({ where: { userId: user.id } });
  await prisma.vaccination.createMany({
    data: [
      {
        userId: user.id,
        name: 'COVID-19',
        manufacturer: 'Pfizer-BioNTech',
        doseNumber: 3,
        totalDoses: 3,
        dateGiven: new Date('2023-11-14'),
        batchNumber: 'FK8724',
        administeredBy: 'Jordan University Hospital',
        administeredAt: 'Amman, Jordan',
        certificateNumber: 'JO-COV-2023-0481221',
      },
      {
        userId: user.id,
        name: 'Influenza (Seasonal)',
        manufacturer: 'Sanofi',
        doseNumber: 1,
        totalDoses: 1,
        dateGiven: new Date('2025-10-02'),
        expiresAt: new Date('2026-09-30'),
        batchNumber: 'SF55102',
        administeredBy: 'Al-Israa Hospital',
        administeredAt: 'Amman, Jordan',
      },
      {
        userId: user.id,
        name: 'Tetanus / Diphtheria (Td)',
        manufacturer: 'GSK',
        doseNumber: 1,
        totalDoses: 1,
        dateGiven: new Date('2022-06-20'),
        expiresAt: new Date('2032-06-20'),
        batchNumber: 'GSK-TD-2022-A12',
        administeredBy: 'Primary Care Clinic',
        administeredAt: 'Amman, Jordan',
      },
      {
        userId: user.id,
        name: 'Yellow Fever',
        manufacturer: 'Sanofi Pasteur',
        doseNumber: 1,
        totalDoses: 1,
        dateGiven: new Date('2021-02-11'),
        batchNumber: 'YF-SP-21-077',
        administeredBy: 'Travel Clinic Amman',
        administeredAt: 'Amman, Jordan',
        certificateNumber: 'ICVP-JO-2021-9841',
        notes: 'ICVP — International Certificate of Vaccination',
      },
      {
        userId: user.id,
        name: 'Hepatitis B',
        manufacturer: 'Merck (Recombivax HB)',
        doseNumber: 3,
        totalDoses: 3,
        dateGiven: new Date('2019-01-15'),
        batchNumber: 'HBV-MRK-19-331',
        administeredBy: 'Jordan University Hospital',
        administeredAt: 'Amman, Jordan',
        notes: 'Full 3-dose series completed',
      },
      {
        userId: user.id,
        name: 'Measles, Mumps, Rubella (MMR)',
        manufacturer: 'GSK (Priorix)',
        doseNumber: 2,
        totalDoses: 2,
        dateGiven: new Date('1994-07-08'),
        batchNumber: 'MMR-GSK-94-10',
        administeredBy: 'Ministry of Health — Childhood Immunization',
        administeredAt: 'Amman, Jordan',
      },
      {
        userId: user.id,
        name: 'Typhoid (Typhim Vi)',
        manufacturer: 'Sanofi Pasteur',
        doseNumber: 1,
        totalDoses: 1,
        dateGiven: new Date('2024-06-03'),
        expiresAt: new Date('2027-06-03'),
        batchNumber: 'TYP-SP-24-201',
        administeredBy: 'Travel Clinic Amman',
        administeredAt: 'Amman, Jordan',
        notes: 'Required for travel to Southeast Asia',
      },
      {
        userId: user.id,
        name: 'Meningococcal ACWY (Menveo)',
        manufacturer: 'GSK',
        doseNumber: 1,
        totalDoses: 1,
        dateGiven: new Date('2023-03-21'),
        expiresAt: new Date('2028-03-21'),
        batchNumber: 'MEN-GSK-23-88',
        administeredBy: 'Prince Hamza Hospital',
        administeredAt: 'Amman, Jordan',
        certificateNumber: 'JO-MEN-2023-0341',
        notes: 'Required for Hajj pilgrimage',
      },
      {
        userId: user.id,
        name: 'Pneumococcal (PCV13, Prevnar 13)',
        manufacturer: 'Pfizer',
        doseNumber: 1,
        totalDoses: 1,
        dateGiven: new Date('2024-11-18'),
        batchNumber: 'PCV-PFE-24-014',
        administeredBy: 'Al-Israa Hospital',
        administeredAt: 'Amman, Jordan',
      },
      {
        userId: user.id,
        name: 'Hepatitis A',
        manufacturer: 'GSK (Havrix)',
        doseNumber: 2,
        totalDoses: 2,
        dateGiven: new Date('2018-09-12'),
        batchNumber: 'HAV-GSK-18-562',
        administeredBy: 'Primary Care Clinic',
        administeredAt: 'Amman, Jordan',
        notes: 'Long-term protection (~20 years)',
      },
    ],
  });

  // Insurance card — issued via Royal Medical Services (military), family coverage
  const juhForInsurance = hospitals.find(
    (h) => h.nameEn === 'Jordan University Hospital',
  );
  await prisma.insuranceCard.upsert({
    where: { userId: user.id },
    update: {
      provider: 'Royal Medical Services',
      providerAr: 'الخدمات الطبية الملكية',
      memberNumber: 'RMS-204918',
      nationalId: '9881234567',
      holderName: 'أحمد العلي',
      coverageType: InsuranceCoverageType.MILITARY,
      coverageScope: InsuranceCoverageScope.FAMILY,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2027-12-31'),
      photoUrl: null,
      source: InsuranceCardSource.SANAD,
      issuedByHospitalId: juhForInsurance?.id ?? null,
    },
    create: {
      userId: user.id,
      provider: 'Royal Medical Services',
      providerAr: 'الخدمات الطبية الملكية',
      memberNumber: 'RMS-204918',
      nationalId: '9881234567',
      holderName: 'أحمد العلي',
      coverageType: InsuranceCoverageType.MILITARY,
      coverageScope: InsuranceCoverageScope.FAMILY,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2027-12-31'),
      source: InsuranceCardSource.SANAD,
      issuedByHospitalId: juhForInsurance?.id ?? null,
    },
  });

  console.log(`  → ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

type SeededDoctor = {
  id: string;
  userId: string;
  nameEn: string;
};

const DOCTORS = [
  {
    email: 'dr.layla@hayat.jo',
    fullName: 'Dr. Layla Haddad',
    fullNameAr: 'د. ليلى حداد',
    phoneNumber: '+962791100001',
    licenseNumber: 'JMC-2016-4412',
    specialty: 'Internal Medicine',
    specialtyAr: 'الباطنية',
    departmentCode: 'INTMED',
    hospitalEn: 'Jordan University Hospital',
    yearsExperience: 12,
    bio: 'Internal medicine specialist focused on diabetes and hypertension management. Trained at JUH and King\u2019s College London.',
    bioAr: 'أخصائية باطنية تركّز على إدارة السكري وضغط الدم. تدربت في مستشفى الجامعة الأردنية وكينغز كوليدج لندن.',
    photoUrl:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop',
    languages: ['ar', 'en'],
    rating: 4.9,
    isDefault: true,
  },
  {
    email: 'dr.omar@hayat.jo',
    fullName: 'Dr. Omar Khalil',
    fullNameAr: 'د. عمر خليل',
    phoneNumber: '+962791100002',
    licenseNumber: 'JMC-2011-2201',
    specialty: 'Cardiology',
    specialtyAr: 'أمراض القلب',
    departmentCode: 'CARDIO',
    hospitalEn: 'King Abdullah University Hospital',
    yearsExperience: 17,
    bio: 'Interventional cardiologist. Fellowship at Cleveland Clinic. Focus on coronary disease and heart failure.',
    bioAr: 'طبيب قلب تداخلي، زميل كليفلاند كلينك. يركّز على أمراض الشرايين التاجية وفشل القلب.',
    photoUrl:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop',
    languages: ['ar', 'en'],
    rating: 4.8,
  },
  {
    email: 'dr.nour@hayat.jo',
    fullName: 'Dr. Nour Al-Saadi',
    fullNameAr: 'د. نور السعدي',
    phoneNumber: '+962791100003',
    licenseNumber: 'JMC-2018-5531',
    specialty: 'Pediatrics',
    specialtyAr: 'الأطفال',
    departmentCode: 'PEDIA',
    hospitalEn: 'Queen Rania Al Abdullah Hospital for Children',
    yearsExperience: 9,
    bio: 'Pediatrician specializing in childhood asthma, allergies, and early development. Warm bedside manner.',
    bioAr: 'طبيبة أطفال متخصصة في الربو والحساسية والتطور المبكر. تُعرف بدفء تعاملها مع الأطفال.',
    photoUrl:
      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop',
    languages: ['ar', 'en'],
    rating: 4.9,
  },
  {
    email: 'dr.khalid@hayat.jo',
    fullName: 'Dr. Khalid Mansour',
    fullNameAr: 'د. خالد منصور',
    phoneNumber: '+962791100004',
    licenseNumber: 'JMC-2014-3387',
    specialty: 'Dermatology',
    specialtyAr: 'الجلدية',
    departmentCode: 'DERM',
    hospitalEn: 'Al-Israa Hospital',
    yearsExperience: 14,
    bio: 'Dermatologist with a focus on cosmetic and medical skin care, acne, and eczema.',
    bioAr: 'طبيب جلدية يركّز على العناية التجميلية والطبية بالبشرة وعلاج حب الشباب والإكزيما.',
    photoUrl:
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop',
    languages: ['ar', 'en'],
    rating: 4.7,
  },
  {
    email: 'dr.rania@hayat.jo',
    fullName: 'Dr. Rania Darwish',
    fullNameAr: 'د. رانيا درويش',
    phoneNumber: '+962791100005',
    licenseNumber: 'JMC-2012-2912',
    specialty: 'OB/GYN',
    specialtyAr: 'النسائية والتوليد',
    departmentCode: 'OBGYN',
    hospitalEn: 'Jordan University Hospital',
    yearsExperience: 16,
    bio: 'Obstetrician & gynecologist. Prenatal care, fertility, and minimally invasive gynecological surgery.',
    bioAr: 'طبيبة نسائية وتوليد. متابعة الحمل، الخصوبة، وجراحات نسائية بالمنظار.',
    photoUrl:
      'https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=400&h=400&fit=crop',
    languages: ['ar', 'en'],
    rating: 4.8,
  },
];

async function seedDoctors(
  hospitals: { id: string; nameEn: string }[],
): Promise<SeededDoctor[]> {
  console.log('Seeding doctors...');
  const passwordHash = await bcrypt.hash('doctor1234', 12);
  const results: SeededDoctor[] = [];

  for (const d of DOCTORS) {
    const hospital = hospitals.find((h) => h.nameEn === d.hospitalEn);
    const department = hospital
      ? await prisma.department.findUnique({
          where: {
            hospitalId_code: {
              hospitalId: hospital.id,
              code: d.departmentCode,
            },
          },
        })
      : null;

    const doctorUser = await prisma.user.upsert({
      where: { email: d.email },
      update: {
        fullName: d.fullName,
        phoneNumber: d.phoneNumber,
        role: UserRole.DOCTOR,
      },
      create: {
        email: d.email,
        passwordHash,
        authProvider: AuthProvider.LOCAL,
        emailVerified: true,
        fullName: d.fullName,
        phoneNumber: d.phoneNumber,
        role: UserRole.DOCTOR,
        preferredLocale: 'ar',
      },
    });

    const existing = await prisma.doctor.findUnique({
      where: { userId: doctorUser.id },
    });
    const doctor = existing
      ? await prisma.doctor.update({
          where: { id: existing.id },
          data: {
            specialty: d.specialty,
            specialtyAr: d.specialtyAr,
            bio: d.bio,
            bioAr: d.bioAr,
            photoUrl: d.photoUrl,
            yearsExperience: d.yearsExperience,
            languages: d.languages,
            rating: d.rating,
            hospitalId: hospital?.id ?? null,
            departmentId: department?.id ?? null,
            isAvailable: true,
          },
        })
      : await prisma.doctor.create({
          data: {
            userId: doctorUser.id,
            licenseNumber: d.licenseNumber,
            specialty: d.specialty,
            specialtyAr: d.specialtyAr,
            bio: d.bio,
            bioAr: d.bioAr,
            photoUrl: d.photoUrl,
            yearsExperience: d.yearsExperience,
            languages: d.languages,
            rating: d.rating,
            hospitalId: hospital?.id ?? null,
            departmentId: department?.id ?? null,
            isAvailable: true,
          },
        });

    results.push({ id: doctor.id, userId: doctorUser.id, nameEn: d.fullName });
  }

  console.log(`Seeded ${results.length} doctors.`);
  return results;
}

async function seedDefaultThread(
  patientEmail: string,
  doctors: SeededDoctor[],
) {
  const patient = await prisma.user.findUnique({
    where: { email: patientEmail },
  });
  const layla = doctors.find((d) => d.nameEn === 'Dr. Layla Haddad');
  if (!patient || !layla) return;

  await prisma.user.update({
    where: { id: patient.id },
    data: { defaultDoctorId: layla.id },
  });

  const thread = await prisma.doctorThread.upsert({
    where: {
      patientId_doctorId: { patientId: patient.id, doctorId: layla.id },
    },
    update: { lastMessageAt: new Date() },
    create: {
      patientId: patient.id,
      doctorId: layla.id,
      lastMessageAt: new Date(),
    },
  });

  await prisma.doctorMessage.deleteMany({ where: { threadId: thread.id } });

  const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

  await prisma.doctorMessage.createMany({
    data: [
      {
        threadId: thread.id,
        sender: DoctorMessageSender.DOCTOR,
        kind: DoctorMessageKind.TEXT,
        body: 'مرحباً أحمد! أنا د. ليلى، طبيبتك المعالجة. كيف يمكنني مساعدتك اليوم؟',
        createdAt: minutesAgo(120),
        readAt: minutesAgo(118),
      },
      {
        threadId: thread.id,
        sender: DoctorMessageSender.PATIENT,
        kind: DoctorMessageKind.TEXT,
        body: 'شكراً دكتورة. عندي بعض الأسئلة حول قراءات السكر الأخيرة.',
        createdAt: minutesAgo(90),
        readAt: minutesAgo(85),
      },
      {
        threadId: thread.id,
        sender: DoctorMessageSender.DOCTOR,
        kind: DoctorMessageKind.TEXT,
        body: 'بالطبع. أرسل لي القراءات وسنراجعها معاً. هل تأخذ Metformin بانتظام؟',
        createdAt: minutesAgo(85),
        readAt: minutesAgo(82),
      },
      {
        threadId: thread.id,
        sender: DoctorMessageSender.PATIENT,
        kind: DoctorMessageKind.TEXT,
        body: 'نعم، مرتين يومياً بعد الأكل.',
        createdAt: minutesAgo(60),
        readAt: minutesAgo(55),
      },
      {
        threadId: thread.id,
        sender: DoctorMessageSender.DOCTOR,
        kind: DoctorMessageKind.TEXT,
        body: 'ممتاز. لو شعرت بأي أعراض جانبية، أخبرني فوراً. أنا متاحة عبر المحادثة أو مكالمة فيديو عند الحاجة.',
        createdAt: minutesAgo(58),
      },
    ],
  });

  console.log(`Seeded default doctor thread with Dr. Layla for ${patientEmail}.`);
}

async function main() {
  const hospitals = await seedHospitals();
  await seedHospitalAdmins(hospitals);
  await seedDemoUser(hospitals);
  const doctors = await seedDoctors(hospitals);
  await seedDefaultThread(DEMO_EMAIL, doctors);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
