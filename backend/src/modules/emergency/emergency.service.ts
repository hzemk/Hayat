import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-db/prisma.service';
import { PushService } from '@modules/push/push.service';
import { AuditService } from '@common/audit/audit.service';
import { CreateEmergencyDto } from './dto/create-emergency.dto';

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly audit: AuditService,
  ) {}

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

    this.logger.warn(
      `EMERGENCY user=${userId} lat=${dto.latitude} lng=${dto.longitude} hospital=${nearest?.nameEn ?? 'none'}`,
    );

    void this.audit.record({
      userId,
      action: 'emergency.create',
      resource: 'EmergencyRequest',
      resourceId: request.id,
      metadata: {
        hospitalId: nearest?.id ?? null,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    // Patient gets a confirmation so they see the system responded.
    void this.push.sendToUser(userId, {
      title: 'Emergency sent',
      body: nearest
        ? `Nearest hospital: ${nearest.nameEn}. Please also call 911.`
        : 'Location sent. Please also call 911.',
      data: { type: 'emergency', emergencyId: request.id },
    });

    // Hospital admins at the nearest hospital get paged.
    if (nearest) {
      const admins = await this.prisma.user.findMany({
        where: { role: 'HOSPITAL_ADMIN', hospitalId: nearest.id },
        select: { id: true },
      });
      if (admins.length > 0) {
        const patient = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { fullName: true, phoneNumber: true },
        });
        void this.push.sendToUsers(
          admins.map((a) => a.id),
          {
            title: 'Emergency request',
            body: `${patient?.fullName ?? 'Patient'} • ${patient?.phoneNumber ?? 'no phone'} • ${dto.latitude.toFixed(4)}, ${dto.longitude.toFixed(4)}`,
            data: {
              type: 'emergency',
              emergencyId: request.id,
              latitude: dto.latitude,
              longitude: dto.longitude,
            },
          },
        );
      }
    }

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
      .map((h) => ({ ...h, d: haversineKm(lat, lng, h.latitude, h.longitude) }))
      .sort((a, b) => a.d - b.d)[0];
  }
}

// Great-circle distance in kilometres. Degrees in, km out.
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
