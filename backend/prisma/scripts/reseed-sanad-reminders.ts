import { PrismaClient, ReminderSource, ReminderStatus, ReminderType } from '@prisma/client';

const PATIENT_EMAIL = 'sanad.user@hayat.jo';

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: PATIENT_EMAIL } });
    if (!user) {
      console.error(`Patient ${PATIENT_EMAIL} not found`);
      process.exit(1);
    }

    const deleted = await prisma.reminder.deleteMany({ where: { userId: user.id } });
    console.log(`Deleted ${deleted.count} existing reminders for ${PATIENT_EMAIL}`);

    const now = new Date();
    const at = (hoursFromNow: number) =>
      new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);

    const reminders = [
      {
        userId: user.id,
        type: ReminderType.MEDICATION,
        title: 'Amoxicillin 500mg',
        subtitle: 'After breakfast — full glass of water',
        scheduledAt: at(2),
        recurrence: 'daily',
        source: ReminderSource.MANUAL,
        status: ReminderStatus.PENDING,
      },
      {
        userId: user.id,
        type: ReminderType.CHECKUP,
        title: 'Evening blood pressure',
        subtitle: 'Sit for 5 min, then record both arms',
        scheduledAt: at(8),
        recurrence: 'daily',
        source: ReminderSource.MANUAL,
        status: ReminderStatus.PENDING,
      },
      {
        userId: user.id,
        type: ReminderType.APPOINTMENT,
        title: 'Cardiology follow-up',
        subtitle: 'Jordan University Hospital — Dr. Khaled',
        scheduledAt: at(48),
        source: ReminderSource.MANUAL,
        status: ReminderStatus.PENDING,
      },
    ];

    const result = await prisma.reminder.createMany({ data: reminders });
    console.log(`Created ${result.count} fresh reminders for ${PATIENT_EMAIL}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
