import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DoctorMessageKind,
  DoctorMessageSender,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@prisma-db/prisma.service';
import { PushService } from '@modules/push/push.service';
import { SendMessageDto } from './dto/send-message.dto';

function truncate(s: string, max = 140): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

@Injectable()
export class DoctorsService {
  private readonly logger = new Logger(DoctorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  listDoctors() {
    return this.prisma.doctor.findMany({
      orderBy: [{ rating: 'desc' }, { yearsExperience: 'desc' }],
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        hospital: { select: { id: true, nameAr: true, nameEn: true } },
        department: { select: { id: true, nameAr: true, nameEn: true, code: true } },
      },
    });
  }

  getSchedule(doctorId: string) {
    return this.prisma.doctorAvailability.findMany({
      where: { doctorId, isActive: true },
      orderBy: { dayOfWeek: 'asc' },
      select: {
        dayOfWeek: true,
        startMinutes: true,
        endMinutes: true,
      },
    });
  }

  async getDoctor(doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        hospital: { select: { id: true, nameAr: true, nameEn: true } },
        department: { select: { id: true, nameAr: true, nameEn: true, code: true } },
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async setDefaultDoctor(patientId: string, doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    await this.prisma.user.update({
      where: { id: patientId },
      data: { defaultDoctorId: doctorId },
    });
    await this.ensureThread(patientId, doctorId);
    return { ok: true, defaultDoctorId: doctorId };
  }

  listMyThreads(patientId: string) {
    return this.prisma.doctorThread.findMany({
      where: { patientId },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        doctor: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async ensureThread(patientId: string, doctorId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    const existing = await this.prisma.doctorThread.findUnique({
      where: { patientId_doctorId: { patientId, doctorId } },
    });
    if (existing) return existing;
    return this.prisma.doctorThread.create({
      data: { patientId, doctorId, lastMessageAt: new Date() },
    });
  }

  async listMessages(patientId: string, doctorId: string) {
    const thread = await this.ensureThread(patientId, doctorId);
    const messages = await this.prisma.doctorMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
    });
    // Mark any unread DOCTOR messages as read
    await this.prisma.doctorMessage.updateMany({
      where: {
        threadId: thread.id,
        sender: DoctorMessageSender.DOCTOR,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { thread, messages };
  }

  async sendMessage(
    patientId: string,
    doctorId: string,
    dto: SendMessageDto,
    sender: DoctorMessageSender = DoctorMessageSender.PATIENT,
  ) {
    const thread = await this.ensureThread(patientId, doctorId);
    const now = new Date();
    const message = await this.prisma.doctorMessage.create({
      data: {
        threadId: thread.id,
        sender,
        kind: dto.kind ?? DoctorMessageKind.TEXT,
        body: dto.body,
        metadata: (dto.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    await this.prisma.doctorThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: now, updatedAt: now },
    });

    // Push to the other party.
    void this.notifyRecipient(thread.patientId, thread.doctorId, sender, dto.body);

    // If the patient sent a symptom summary or RX request, auto-reply as doctor
    // with a short acknowledgement so demo feels alive until a real doctor UI exists.
    if (
      sender === DoctorMessageSender.PATIENT &&
      (dto.kind === DoctorMessageKind.SYMPTOM_SUMMARY ||
        dto.kind === DoctorMessageKind.RX_REQUEST)
    ) {
      await this.autoAcknowledge(thread.id, dto.kind);
    }

    return message;
  }

  private async notifyRecipient(
    patientId: string,
    doctorId: string,
    sender: DoctorMessageSender,
    body: string,
  ) {
    try {
      if (sender === DoctorMessageSender.PATIENT) {
        const doctor = await this.prisma.doctor.findUnique({
          where: { id: doctorId },
          select: { userId: true, user: { select: { fullName: true } } },
        });
        const patient = await this.prisma.user.findUnique({
          where: { id: patientId },
          select: { fullName: true },
        });
        if (!doctor) return;
        await this.push.sendToUser(doctor.userId, {
          title: patient?.fullName ?? 'Patient',
          body: truncate(body),
          data: { type: 'doctor-thread', patientId },
        });
      } else if (sender === DoctorMessageSender.DOCTOR) {
        const doctor = await this.prisma.doctor.findUnique({
          where: { id: doctorId },
          select: { user: { select: { fullName: true } } },
        });
        await this.push.sendToUser(patientId, {
          title: doctor?.user?.fullName ?? 'Doctor',
          body: truncate(body),
          data: { type: 'doctor-thread', doctorId },
        });
      }
    } catch (err) {
      this.logger.warn(`notifyRecipient failed: ${(err as Error).message}`);
    }
  }

  private async autoAcknowledge(threadId: string, kind: DoctorMessageKind) {
    const body =
      kind === DoctorMessageKind.SYMPTOM_SUMMARY
        ? 'استلمت ملخص الأعراض. سأراجعها خلال ساعة وأرد عليك. إذا تدهورت الحالة اتصل بالطوارئ مباشرة.'
        : 'استلمت طلب الوصفة. سأراجع سجلك وأصدر الوصفة قريباً.';
    setTimeout(() => {
      this.prisma.doctorMessage
        .create({
          data: {
            threadId,
            sender: DoctorMessageSender.DOCTOR,
            kind: DoctorMessageKind.TEXT,
            body,
          },
        })
        .then(() =>
          this.prisma.doctorThread.update({
            where: { id: threadId },
            data: { lastMessageAt: new Date() },
          }),
        )
        .catch((err) => this.logger.warn(`Auto-ack failed: ${err.message}`));
    }, 2500);
  }

  async markRead(patientId: string, doctorId: string, messageId: string) {
    const thread = await this.ensureThread(patientId, doctorId);
    const message = await this.prisma.doctorMessage.findUnique({
      where: { id: messageId },
    });
    if (!message || message.threadId !== thread.id) {
      throw new NotFoundException('Message not found');
    }
    if (message.readAt) return message;
    return this.prisma.doctorMessage.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  unreadCount(patientId: string) {
    return this.prisma.doctorMessage.count({
      where: {
        thread: { patientId },
        sender: DoctorMessageSender.DOCTOR,
        readAt: null,
      },
    });
  }

  getMyRating(patientId: string, doctorId: string) {
    return this.prisma.doctorRating.findUnique({
      where: { patientId_doctorId: { patientId, doctorId } },
    });
  }

  async rateDoctor(
    patientId: string,
    doctorId: string,
    input: { stars: number; comment?: string },
  ) {
    if (input.stars < 1 || input.stars > 5) {
      throw new BadRequestException('stars must be between 1 and 5');
    }
    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const rating = await this.prisma.doctorRating.upsert({
      where: { patientId_doctorId: { patientId, doctorId } },
      create: {
        patientId,
        doctorId,
        stars: input.stars,
        comment: input.comment ?? null,
      },
      update: {
        stars: input.stars,
        comment: input.comment ?? null,
      },
    });

    const agg = await this.prisma.doctorRating.aggregate({
      where: { doctorId },
      _avg: { stars: true },
      _count: { _all: true },
    });
    await this.prisma.doctor.update({
      where: { id: doctorId },
      data: { rating: agg._avg.stars ?? null },
    });

    return { rating, average: agg._avg.stars, count: agg._count._all };
  }
}
