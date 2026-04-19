import {
  PrismaClient,
  ReminderSource,
  DoctorMessageSender,
  DoctorMessageKind,
} from '@prisma/client';

const PATIENT_EMAIL = 'ahmed@hayat.jo';
const DOCTOR_EMAIL = 'dr.layla@hayat.jo';

async function main() {
  const prisma = new PrismaClient();
  try {
    const patient = await prisma.user.findUnique({ where: { email: PATIENT_EMAIL } });
    if (!patient) {
      console.error(`Patient ${PATIENT_EMAIL} not found`);
      process.exit(1);
    }

    const doctorUser = await prisma.user.findUnique({
      where: { email: DOCTOR_EMAIL },
      include: { doctor: true },
    });
    if (!doctorUser?.doctor) {
      console.error(`Doctor ${DOCTOR_EMAIL} not found or has no doctor profile`);
      process.exit(1);
    }
    const doctor = doctorUser.doctor;

    // 1. Lock the 3 seeded reminders as prescription-sourced.
    const rxUpdate = await prisma.reminder.updateMany({
      where: {
        userId: patient.id,
        title: {
          in: [
            'Atorvastatin 20mg',
            'Blood pressure reading',
            'Dentist — 6-month cleaning',
          ],
        },
      },
      data: { source: ReminderSource.PRESCRIPTION },
    });
    console.log(`Locked ${rxUpdate.count} reminders as PRESCRIPTION for ${PATIENT_EMAIL}`);

    // 2. Upsert the Dr. Layla ↔ Ahmed thread.
    const thread = await prisma.doctorThread.upsert({
      where: {
        patientId_doctorId: { patientId: patient.id, doctorId: doctor.id },
      },
      update: {},
      create: { patientId: patient.id, doctorId: doctor.id },
    });

    // 3. Replace messages idempotently so re-runs stay clean.
    await prisma.doctorMessage.deleteMany({ where: { threadId: thread.id } });

    const now = new Date();
    const at = (minutesAgo: number) =>
      new Date(now.getTime() - minutesAgo * 60 * 1000);

    const messages = [
      {
        sender: DoctorMessageSender.PATIENT,
        kind: DoctorMessageKind.TEXT,
        body:
          "Hello Dr. Layla, I've been feeling a bit dizzy lately and my last lipid panel came back high. Could you review?",
        createdAt: at(180),
      },
      {
        sender: DoctorMessageSender.DOCTOR,
        kind: DoctorMessageKind.TEXT,
        body:
          'Hi Ahmed — thanks for reaching out. I looked at your recent labs. LDL is elevated and your BP has been borderline on your last two visits. Let’s start a mild statin and monitor BP daily for two weeks.',
        createdAt: at(178),
      },
      {
        sender: DoctorMessageSender.DOCTOR,
        kind: DoctorMessageKind.RX_ISSUED,
        body: 'Prescribed Atorvastatin 20mg — once daily before bedtime.',
        metadata: {
          medication: 'Atorvastatin',
          dose: '20mg',
          frequency: 'Once daily, bedtime',
          durationDays: 90,
        },
        createdAt: at(177),
      },
      {
        sender: DoctorMessageSender.DOCTOR,
        kind: DoctorMessageKind.RX_ISSUED,
        body:
          'Also please record your blood pressure twice a day (both arms). I will review the readings next week.',
        metadata: {
          measurement: 'Blood pressure',
          frequency: 'Twice daily',
          notes: 'Record both arms',
        },
        createdAt: at(176),
      },
      {
        sender: DoctorMessageSender.PATIENT,
        kind: DoctorMessageKind.TEXT,
        body: 'Understood. Should I also book the dental cleaning you mentioned last time?',
        createdAt: at(120),
      },
      {
        sender: DoctorMessageSender.DOCTOR,
        kind: DoctorMessageKind.TEXT,
        body:
          'Yes — please schedule a 6-month cleaning at Amman Dental Center. Periodontal health matters for cardiovascular outcomes too.',
        createdAt: at(118),
      },
      {
        sender: DoctorMessageSender.DOCTOR,
        kind: DoctorMessageKind.RX_ISSUED,
        body: 'Referral: Dentist — 6-month cleaning (Amman Dental Center).',
        metadata: {
          referral: 'Dental cleaning',
          clinic: 'Amman Dental Center',
          interval: '6 months',
        },
        createdAt: at(117),
      },
      {
        sender: DoctorMessageSender.PATIENT,
        kind: DoctorMessageKind.TEXT,
        body: 'Thank you, doctor. I’ll start tonight and log the readings.',
        createdAt: at(60),
      },
      {
        sender: DoctorMessageSender.DOCTOR,
        kind: DoctorMessageKind.TEXT,
        body:
          'Perfect. Message me if you notice any muscle pain on the statin or BP above 150/95. Take care, Ahmed.',
        createdAt: at(58),
      },
    ];

    for (const m of messages) {
      await prisma.doctorMessage.create({
        data: {
          threadId: thread.id,
          sender: m.sender,
          kind: m.kind,
          body: m.body,
          metadata: m.metadata ?? undefined,
          createdAt: m.createdAt,
        },
      });
    }

    await prisma.doctorThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: messages[messages.length - 1].createdAt },
    });

    console.log(
      `Seeded ${messages.length} messages on thread ${thread.id} between ${PATIENT_EMAIL} and Dr. Layla`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
