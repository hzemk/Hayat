import { Injectable } from '@nestjs/common';
import { ReminderStatus } from '@prisma/client';
import { PrismaService } from '@prisma-db/prisma.service';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  listMine(userId: string) {
    return this.prisma.reminder.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }],
    });
  }

  listUpcoming(userId: string, limit = 5) {
    const now = new Date();
    return this.prisma.reminder.findMany({
      where: {
        userId,
        status: ReminderStatus.PENDING,
        scheduledAt: { gt: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });
  }
}
