import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-db/prisma.service';
import { CreateEmergencyDto } from './dto/create-emergency.dto';

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async request(userId: string, dto: CreateEmergencyDto) {
    const nearest = await this.findNearestHospital(dto.latitude, dto.longitude);

    const request = await this.prisma.emergencyRequest.create({
      data: {
        userId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        note: dto.note,
        hospitalId: nearest?.id,
      },
    });

    // In production: push to dispatch service + SMS on-call staff.
    // MVP: log. Patient is instructed client-side to also dial 911 directly.
    this.logger.warn(
      `EMERGENCY user=${userId} lat=${dto.latitude} lng=${dto.longitude} hospital=${nearest?.nameEn ?? 'none'}`,
    );

    return {
      id: request.id,
      requestedAt: request.requestedAt,
      status: request.status,
      nearestHospital: nearest
        ? { id: nearest.id, nameAr: nearest.nameAr, nameEn: nearest.nameEn, phone: nearest.phone }
        : null,
      instructions: {
        ar: 'تم إرسال موقعك. يرجى الاتصال أيضاً على 911 الآن.',
        en: 'Your location has been sent. Please also call 911 now.',
      },
    };
  }

  listMine(userId: string) {
    return this.prisma.emergencyRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
      take: 20,
    });
  }

  private async findNearestHospital(lat: number, lng: number) {
    const hospitals = await this.prisma.hospital.findMany();
    if (hospitals.length === 0) return null;
    return hospitals
      .map((h) => ({ ...h, d: (h.latitude - lat) ** 2 + (h.longitude - lng) ** 2 }))
      .sort((a, b) => a.d - b.d)[0];
  }
}
