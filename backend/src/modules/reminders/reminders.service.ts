import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReminderSource, ReminderStatus } from '@prisma/client';
import { PrismaService } from '@prisma-db/prisma.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';

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
    return this.prisma.reminder.findMany({
      where: { userId, status: ReminderStatus.PENDING },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });
  }

  create(userId: string, dto: CreateReminderDto) {
    return this.prisma.reminder.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        subtitle: dto.subtitle,
        scheduledAt: new Date(dto.scheduledAt),
        recurrence: dto.recurrence,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateReminderDto) {
    const reminder = await this.prisma.reminder.findUnique({ where: { id } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    if (reminder.userId !== userId) throw new ForbiddenException();

    let completedAt: Date | null | undefined = undefined;
    if (dto.status === ReminderStatus.DONE) completedAt = new Date();
    else if (dto.status) completedAt = null;

    return this.prisma.reminder.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title,
        subtitle: dto.subtitle,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        recurrence: dto.recurrence,
        status: dto.status,
        completedAt,
      },
    });
  }

  async remove(userId: string, id: string) {
    const reminder = await this.prisma.reminder.findUnique({ where: { id } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    if (reminder.userId !== userId) throw new ForbiddenException();
    if (reminder.source === ReminderSource.PRESCRIPTION) {
      throw new ForbiddenException(
        'Prescription reminders are managed by your doctor and cannot be deleted.',
      );
    }

    await this.prisma.reminder.delete({ where: { id } });
  }
}
