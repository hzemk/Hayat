-- Hayat demo seed — run AFTER full_setup.sql
-- Safe to re-run: wipes demo data first, then inserts fresh rows.
--
-- Demo credentials:
--   Patient:  ahmed@hayat.jo    / hayat1234
--   Doctors:  dr.layla@hayat.jo / doctor1234  (and 4 more)

BEGIN;

-- === Clean up prior demo rows (idempotent) =================================
DELETE FROM "DoctorMessage";
DELETE FROM "VideoCall";
DELETE FROM "DoctorThread";
DELETE FROM "PrescriptionItem";
DELETE FROM "Prescription";
DELETE FROM "Reminder";
DELETE FROM "FamilyMedication";
DELETE FROM "FamilyMember";
DELETE FROM "Appointment";
DELETE FROM "Vaccination";
DELETE FROM "EmergencyContact";
DELETE FROM "Allergy";
DELETE FROM "Medication";
DELETE FROM "Condition";
DELETE FROM "MedicalRecord";
DELETE FROM "Doctor";
DELETE FROM "Department";
DELETE FROM "Hospital";
DELETE FROM "RefreshToken";
UPDATE "User" SET "defaultDoctorId" = NULL WHERE "email" IN (
  'ahmed@hayat.jo',
  'dr.layla@hayat.jo','dr.omar@hayat.jo','dr.nour@hayat.jo',
  'dr.khalid@hayat.jo','dr.rania@hayat.jo'
);
DELETE FROM "User" WHERE "email" IN (
  'ahmed@hayat.jo',
  'dr.layla@hayat.jo','dr.omar@hayat.jo','dr.nour@hayat.jo',
  'dr.khalid@hayat.jo','dr.rania@hayat.jo'
);

-- === Hospitals =============================================================
INSERT INTO "Hospital" (id, "nameAr", "nameEn", phone, "addressAr", "addressEn", city, latitude, longitude, "isGovernment", "createdAt", "updatedAt") VALUES
  ('11111111-0000-0000-0000-000000000001', 'مستشفى الجامعة الأردنية', 'Jordan University Hospital', '+96265353444', 'الجبيهة، عمّان', 'Al-Jubaiha, Amman', 'Amman', 31.9792, 35.8703, true, NOW(), NOW()),
  ('11111111-0000-0000-0000-000000000002', 'مستشفى البشير', 'Al-Bashir Hospital', '+96264775111', 'الأشرفية، عمّان', 'Ashrafieh, Amman', 'Amman', 31.9321, 35.9424, true, NOW(), NOW()),
  ('11111111-0000-0000-0000-000000000003', 'مستشفى الملكة رانيا العبدالله للأطفال', 'Queen Rania Al Abdullah Hospital for Children', '+96265353444', 'الجامعة الأردنية، عمّان', 'University of Jordan, Amman', 'Amman', 31.9783, 35.8704, true, NOW(), NOW()),
  ('11111111-0000-0000-0000-000000000004', 'مستشفى الملك المؤسس عبدالله الجامعي', 'King Abdullah University Hospital', '+96227200600', 'الرمثا، إربد', 'Ar-Ramtha, Irbid', 'Irbid', 32.4842, 35.9864, true, NOW(), NOW()),
  ('11111111-0000-0000-0000-000000000005', 'مستشفى الأمير حمزة', 'Prince Hamza Hospital', '+96265056000', 'طبربور، عمّان', 'Tabarbour, Amman', 'Amman', 32.0189, 35.9312, true, NOW(), NOW()),
  ('11111111-0000-0000-0000-000000000006', 'مستشفى الإسراء', 'Al-Israa Hospital', '+96265802900', 'شارع المدينة المنورة، عمّان', 'Al-Madina Al-Munawwara St, Amman', 'Amman', 31.9699, 35.8519, false, NOW(), NOW());

-- === Departments (8 per hospital) ==========================================
-- We generate them via INSERT ... SELECT from a VALUES list cross-joined with hospitals.
INSERT INTO "Department" (id, "hospitalId", "nameAr", "nameEn", code, "createdAt")
SELECT gen_random_uuid(), h.id, d."nameAr", d."nameEn", d.code, NOW()
FROM (VALUES
  ('ER','الطوارئ','Emergency'),
  ('CARDIO','أمراض القلب','Cardiology'),
  ('PEDIA','الأطفال','Pediatrics'),
  ('INTMED','الباطنية','Internal Medicine'),
  ('OBGYN','النسائية والتوليد','OB/GYN'),
  ('ORTHO','جراحة العظام','Orthopedics'),
  ('DERM','الجلدية','Dermatology'),
  ('ENT','الأنف والأذن والحنجرة','ENT')
) AS d(code, "nameAr", "nameEn")
CROSS JOIN "Hospital" h;

-- === Users =================================================================
-- Password hashes precomputed with bcryptjs (cost 12):
--   ahmed@hayat.jo    → hayat1234
--   dr.* @hayat.jo    → doctor1234
INSERT INTO "User" (id, email, "emailVerified", "passwordHash", "authProvider", "phoneNumber", "fullName", "dateOfBirth", gender, "preferredLocale", role, "createdAt", "updatedAt") VALUES
  ('22222222-0000-0000-0000-000000000001', 'ahmed@hayat.jo',    true, '$2a$12$JcIVUTU7HC3dHHAh28DxaOmYzkeAFkziDQM1kD2pkt918eAAHMAsO', 'LOCAL', '+962791234567', 'أحمد العلي',         '1990-05-12', 'MALE',   'ar', 'PATIENT', NOW(), NOW()),
  ('33333333-0000-0000-0000-000000000001', 'dr.layla@hayat.jo', true, '$2a$12$.LyBv/H57WtpUUIZPskG..o/g6Ebbs2x2zi5E4fQf6Ik.LZ7pUbKO', 'LOCAL', '+962791100001', 'Dr. Layla Haddad',   NULL, 'FEMALE', 'ar', 'DOCTOR', NOW(), NOW()),
  ('33333333-0000-0000-0000-000000000002', 'dr.omar@hayat.jo',  true, '$2a$12$.LyBv/H57WtpUUIZPskG..o/g6Ebbs2x2zi5E4fQf6Ik.LZ7pUbKO', 'LOCAL', '+962791100002', 'Dr. Omar Khalil',    NULL, 'MALE',   'ar', 'DOCTOR', NOW(), NOW()),
  ('33333333-0000-0000-0000-000000000003', 'dr.nour@hayat.jo',  true, '$2a$12$.LyBv/H57WtpUUIZPskG..o/g6Ebbs2x2zi5E4fQf6Ik.LZ7pUbKO', 'LOCAL', '+962791100003', 'Dr. Nour Al-Saadi',  NULL, 'FEMALE', 'ar', 'DOCTOR', NOW(), NOW()),
  ('33333333-0000-0000-0000-000000000004', 'dr.khalid@hayat.jo',true, '$2a$12$.LyBv/H57WtpUUIZPskG..o/g6Ebbs2x2zi5E4fQf6Ik.LZ7pUbKO', 'LOCAL', '+962791100004', 'Dr. Khalid Mansour', NULL, 'MALE',   'ar', 'DOCTOR', NOW(), NOW()),
  ('33333333-0000-0000-0000-000000000005', 'dr.rania@hayat.jo', true, '$2a$12$.LyBv/H57WtpUUIZPskG..o/g6Ebbs2x2zi5E4fQf6Ik.LZ7pUbKO', 'LOCAL', '+962791100005', 'Dr. Rania Darwish',  NULL, 'FEMALE', 'ar', 'DOCTOR', NOW(), NOW());

-- === Doctors ================================================================
INSERT INTO "Doctor" (id, "userId", "licenseNumber", specialty, "specialtyAr", bio, "bioAr", "photoUrl", "yearsExperience", languages, rating, "pricePerMinute", "isAvailable", "hospitalId", "departmentId", "createdAt")
SELECT
  '44444444-0000-0000-0000-000000000001',
  '33333333-0000-0000-0000-000000000001',
  'JMC-2016-4412', 'Internal Medicine', 'الباطنية',
  'Internal medicine specialist focused on diabetes and hypertension management.',
  'أخصائية باطنية تركّز على إدارة السكري وضغط الدم.',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop',
  12, ARRAY['ar','en']::text[], 4.9, 2, true,
  '11111111-0000-0000-0000-000000000001',
  d.id, NOW()
FROM "Department" d WHERE d."hospitalId"='11111111-0000-0000-0000-000000000001' AND d.code='INTMED';

INSERT INTO "Doctor" (id, "userId", "licenseNumber", specialty, "specialtyAr", bio, "bioAr", "photoUrl", "yearsExperience", languages, rating, "pricePerMinute", "isAvailable", "hospitalId", "departmentId", "createdAt")
SELECT
  '44444444-0000-0000-0000-000000000002',
  '33333333-0000-0000-0000-000000000002',
  'JMC-2011-2201', 'Cardiology', 'أمراض القلب',
  'Interventional cardiologist. Focus on coronary disease and heart failure.',
  'طبيب قلب تداخلي. يركّز على أمراض الشرايين التاجية وفشل القلب.',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop',
  17, ARRAY['ar','en']::text[], 4.8, 3, true,
  '11111111-0000-0000-0000-000000000004',
  d.id, NOW()
FROM "Department" d WHERE d."hospitalId"='11111111-0000-0000-0000-000000000004' AND d.code='CARDIO';

INSERT INTO "Doctor" (id, "userId", "licenseNumber", specialty, "specialtyAr", bio, "bioAr", "photoUrl", "yearsExperience", languages, rating, "pricePerMinute", "isAvailable", "hospitalId", "departmentId", "createdAt")
SELECT
  '44444444-0000-0000-0000-000000000003',
  '33333333-0000-0000-0000-000000000003',
  'JMC-2018-5531', 'Pediatrics', 'الأطفال',
  'Pediatrician specializing in childhood asthma, allergies, and early development.',
  'طبيبة أطفال متخصصة في الربو والحساسية والتطور المبكر.',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop',
  9, ARRAY['ar','en']::text[], 4.9, 2, true,
  '11111111-0000-0000-0000-000000000003',
  d.id, NOW()
FROM "Department" d WHERE d."hospitalId"='11111111-0000-0000-0000-000000000003' AND d.code='PEDIA';

INSERT INTO "Doctor" (id, "userId", "licenseNumber", specialty, "specialtyAr", bio, "bioAr", "photoUrl", "yearsExperience", languages, rating, "pricePerMinute", "isAvailable", "hospitalId", "departmentId", "createdAt")
SELECT
  '44444444-0000-0000-0000-000000000004',
  '33333333-0000-0000-0000-000000000004',
  'JMC-2014-3387', 'Dermatology', 'الجلدية',
  'Dermatologist with a focus on cosmetic and medical skin care, acne, and eczema.',
  'طبيب جلدية يركّز على العناية التجميلية والطبية بالبشرة.',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop',
  14, ARRAY['ar','en']::text[], 4.7, 2, true,
  '11111111-0000-0000-0000-000000000006',
  d.id, NOW()
FROM "Department" d WHERE d."hospitalId"='11111111-0000-0000-0000-000000000006' AND d.code='DERM';

INSERT INTO "Doctor" (id, "userId", "licenseNumber", specialty, "specialtyAr", bio, "bioAr", "photoUrl", "yearsExperience", languages, rating, "pricePerMinute", "isAvailable", "hospitalId", "departmentId", "createdAt")
SELECT
  '44444444-0000-0000-0000-000000000005',
  '33333333-0000-0000-0000-000000000005',
  'JMC-2012-2912', 'OB/GYN', 'النسائية والتوليد',
  'Obstetrician & gynecologist. Prenatal care, fertility, minimally invasive surgery.',
  'طبيبة نسائية وتوليد. متابعة الحمل، الخصوبة، وجراحات نسائية بالمنظار.',
  'https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=400&h=400&fit=crop',
  16, ARRAY['ar','en']::text[], 4.8, 3, true,
  '11111111-0000-0000-0000-000000000001',
  d.id, NOW()
FROM "Department" d WHERE d."hospitalId"='11111111-0000-0000-0000-000000000001' AND d.code='OBGYN';

-- Ahmed's default doctor = Dr. Layla
UPDATE "User" SET "defaultDoctorId" = '44444444-0000-0000-0000-000000000001'
WHERE id = '22222222-0000-0000-0000-000000000001';

-- === Medical record + children ==============================================
INSERT INTO "MedicalRecord" (id, "userId", "bloodType", "heightCm", "weightKg", "createdAt", "updatedAt")
VALUES ('55555555-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'O+', 176, 82, NOW(), NOW());

INSERT INTO "Condition" (id, "medicalRecordId", name, "icdCode", "diagnosedAt", status, "createdAt") VALUES
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', 'Type 2 Diabetes', 'E11', '2020-03-10', 'active', NOW()),
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', 'Hypertension',    'I10', '2021-08-22', 'active', NOW());

INSERT INTO "Allergy" (id, "medicalRecordId", substance, severity, reaction, "createdAt") VALUES
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', 'Penicillin', 'severe',   'Rash, difficulty breathing', NOW()),
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', 'Peanuts',    'moderate', 'Hives', NOW());

INSERT INTO "Medication" (id, "medicalRecordId", name, dose, frequency, "startedAt", "createdAt") VALUES
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', 'Metformin',  '500mg', 'Twice daily', '2020-03-10', NOW()),
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', 'Lisinopril', '10mg',  'Once daily',  '2021-08-22', NOW());

INSERT INTO "EmergencyContact" (id, "medicalRecordId", name, relationship, "phoneNumber", "createdAt") VALUES
  (gen_random_uuid(), '55555555-0000-0000-0000-000000000001', 'سارة العلي', 'Spouse', '+962797654321', NOW());

-- === Family members (3 children) ============================================
INSERT INTO "FamilyMember" (id, "guardianId", "fullName", "dateOfBirth", gender, relationship, "bloodType", allergies, conditions, "needsUrgentCare", "urgentCareNote", "createdAt", "updatedAt") VALUES
  ('66666666-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'Layla Al-Ali', '2017-09-04', 'FEMALE', 'child', 'A+',  ARRAY['Dust mites']::text[],  ARRAY['Asthma']::text[],          false, NULL,                                          NOW(), NOW()),
  ('66666666-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'Omar Al-Ali',  '2020-03-22', 'MALE',   'child', 'O+',  ARRAY[]::text[],               ARRAY[]::text[],                  true,  'High fever for 2 days — needs pediatric follow-up', NOW(), NOW()),
  ('66666666-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'Yara Al-Ali',  '2022-11-30', 'FEMALE', 'child', 'AB+', ARRAY[]::text[],               ARRAY[]::text[],                  false, NULL,                                          NOW(), NOW());

INSERT INTO "FamilyMedication" (id, "familyMemberId", name, dose, frequency, "createdAt") VALUES
  (gen_random_uuid(), '66666666-0000-0000-0000-000000000001', 'Ventolin',    '100mcg', 'PRN (as needed)', NOW()),
  (gen_random_uuid(), '66666666-0000-0000-0000-000000000001', 'Cetirizine',  '5mg',    'Once daily',       NOW()),
  (gen_random_uuid(), '66666666-0000-0000-0000-000000000002', 'Paracetamol', '120mg/5ml', 'Every 6h',      NOW());

-- === Reminders ==============================================================
INSERT INTO "Reminder" (id, "userId", type, title, subtitle, "scheduledAt", recurrence, status, "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'MEDICATION',  'Metformin 500mg',        'After breakfast',             NOW() + INTERVAL  '2 hours',  'daily',  'PENDING', NOW(), NOW()),
  (gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'MEDICATION',  'Lisinopril 10mg',        'Morning dose',                NOW() - INTERVAL  '1 hour',   'daily',  'DONE',    NOW(), NOW()),
  (gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'APPOINTMENT', 'Cardiology follow-up',   'Jordan University Hospital',  NOW() + INTERVAL '48 hours',  NULL,     'PENDING', NOW(), NOW()),
  (gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'CHECKUP',     'Blood glucose check',    'Fasting',                     NOW() + INTERVAL '20 hours',  'weekly', 'PENDING', NOW(), NOW());

-- === Appointment ============================================================
INSERT INTO "Appointment" (id, "userId", "hospitalId", "departmentId", "scheduledAt", status, reason, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  '22222222-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  d.id,
  NOW() + INTERVAL '48 hours',
  'CONFIRMED',
  'Follow-up for hypertension',
  NOW(), NOW()
FROM "Department" d
WHERE d."hospitalId"='11111111-0000-0000-0000-000000000001' AND d.code='CARDIO';

-- === Prescription ===========================================================
INSERT INTO "Prescription" (id, "patientId", "doctorUserId", "issuedAt", "expiresAt", status, notes, "createdAt", "updatedAt") VALUES
  ('77777777-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   NOW() - INTERVAL '2 days', NOW() + INTERVAL '88 days', 'ACTIVE',
   'Chronic medications — diabetes & hypertension', NOW(), NOW());

INSERT INTO "PrescriptionItem" ("id", "prescriptionId", "medicationName", dose, frequency, "durationDays", "instructionsAr", "instructionsEn") VALUES
  (gen_random_uuid(), '77777777-0000-0000-0000-000000000001', 'Metformin',  '500mg', 'Twice daily', 90, 'بعد الإفطار والعشاء', 'After breakfast and dinner'),
  (gen_random_uuid(), '77777777-0000-0000-0000-000000000001', 'Lisinopril', '10mg',  'Once daily',  90, 'صباحاً',              'Morning');

-- === Vaccinations ===========================================================
INSERT INTO "Vaccination" (id, "userId", name, manufacturer, "doseNumber", "totalDoses", "dateGiven", "expiresAt", "batchNumber", "administeredBy", "administeredAt", "certificateNumber", notes, "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'COVID-19 (Pfizer-BioNTech)', 'Pfizer', 3, 3, '2023-10-15', NULL,         'PFZ-23-4412', 'Ministry of Health Jordan', 'Amman, Jordan', 'JO-VAX-2023-7788',  'Booster dose', NOW(), NOW()),
  (gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'Influenza (Vaxigrip Tetra)',  'Sanofi', 1, 1, '2024-11-02', '2025-11-02', 'VAX-SAN-24-118', 'Al-Bashir Hospital',        'Amman, Jordan', NULL,                'Annual',      NOW(), NOW()),
  (gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'Tetanus-Diphtheria (Td)',     'GSK',    1, 1, '2020-06-10', '2030-06-10', 'GSK-TD-20-334',  'JUH Outpatient Clinic',     'Amman, Jordan', NULL,                '10-year booster', NOW(), NOW()),
  (gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'Hepatitis B',                 'Merck',  3, 3, '2019-04-22', NULL,         'MRK-HEP-19-771', 'JUH',                       'Amman, Jordan', NULL,                NULL,          NOW(), NOW()),
  (gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'MMR (Measles/Mumps/Rubella)', 'GSK',    2, 2, '1993-08-15', NULL,         NULL,             'Primary Care Clinic',       'Amman, Jordan', NULL,                'Childhood immunization', NOW(), NOW()),
  (gen_random_uuid(), '22222222-0000-0000-0000-000000000001', 'Meningococcal ACWY (Menveo)', 'GSK',    1, 1, '2023-03-21', '2028-03-21', 'MEN-GSK-23-88',  'Prince Hamza Hospital',     'Amman, Jordan', 'JO-MEN-2023-0341',  'Required for Hajj pilgrimage', NOW(), NOW());

-- === Default doctor thread with welcome messages ============================
INSERT INTO "DoctorThread" (id, "patientId", "doctorId", "createdAt", "updatedAt", "lastMessageAt") VALUES
  ('88888888-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   '44444444-0000-0000-0000-000000000001',
   NOW(), NOW(), NOW());

INSERT INTO "DoctorMessage" (id, "threadId", sender, kind, body, "readAt", "createdAt") VALUES
  (gen_random_uuid(), '88888888-0000-0000-0000-000000000001', 'DOCTOR',  'TEXT', 'مرحباً أحمد! أنا د. ليلى، طبيبتك المعالجة. كيف يمكنني مساعدتك اليوم؟', NOW() - INTERVAL '118 minutes', NOW() - INTERVAL '120 minutes'),
  (gen_random_uuid(), '88888888-0000-0000-0000-000000000001', 'PATIENT', 'TEXT', 'شكراً دكتورة. عندي بعض الأسئلة حول قراءات السكر الأخيرة.',                    NOW() - INTERVAL  '85 minutes', NOW() - INTERVAL  '90 minutes'),
  (gen_random_uuid(), '88888888-0000-0000-0000-000000000001', 'DOCTOR',  'TEXT', 'بالطبع. أرسل لي القراءات وسنراجعها معاً. هل تأخذ Metformin بانتظام؟',       NOW() - INTERVAL  '82 minutes', NOW() - INTERVAL  '85 minutes'),
  (gen_random_uuid(), '88888888-0000-0000-0000-000000000001', 'PATIENT', 'TEXT', 'نعم، مرتين يومياً بعد الأكل.',                                              NOW() - INTERVAL  '55 minutes', NOW() - INTERVAL  '60 minutes'),
  (gen_random_uuid(), '88888888-0000-0000-0000-000000000001', 'DOCTOR',  'TEXT', 'ممتاز. لو شعرت بأي أعراض جانبية، أخبرني فوراً. أنا متاحة عبر المحادثة أو مكالمة فيديو عند الحاجة.', NULL, NOW() - INTERVAL '58 minutes');

COMMIT;

-- Done!
SELECT 'Hayat demo seed complete. Login with ahmed@hayat.jo / hayat1234' AS result;
