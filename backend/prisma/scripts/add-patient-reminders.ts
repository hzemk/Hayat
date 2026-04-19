import { PrismaClient, ReminderStatus, ReminderType } from '@prisma/client';

const PATIENT_EMAIL = 'ahmed@hayat.jo';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: PATIENT_EMAIL } });
    if (!user) {
      console.error(`Patient ${PATIENT_EMAIL} not found`);
      process.exit(1);
    }

    const now = new Date();
    const at = (hoursFromNow: number) =>
      new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);

    const reminders = [
      {
        userId: user.id,
        type: ReminderType.MEDICATION,
        title: 'Atorvastatin 20mg',
        subtitle: 'Before bedtime',
        scheduledAt: at(3),
        recurrence: 'daily',
        status: ReminderStatus.PENDING,
      },
      {
        userId: user.id,
        type: ReminderType.CHECKUP,
        title: 'Blood pressure reading',
        subtitle: 'Record both arms',
        scheduledAt: at(6),
        recurrence: 'daily',
        status: ReminderStatus.PENDING,
      },
      {
        userId: user.id,
        type: ReminderType.APPOINTMENT,
        title: 'Dentist — 6-month cleaning',
        subtitle: 'Amman Dental Center',
        scheduledAt: at(72),
        status: ReminderStatus.PENDING,
      },
    ];

    const result = await prisma.reminder.createMany({ data: reminders });
    console.log(`Created ${result.count} reminders for ${PATIENT_EMAIL}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
