import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma-db/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        emailVerified: true,
        authProvider: true,
        fullName: true,
        dateOfBirth: true,
        gender: true,
        preferredLocale: true,
        role: true,
        createdAt: true,
        defaultDoctorId: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    });
    if (!existing) throw new NotFoundException('User not found');
    // Gender is write-once: once set, it cannot be changed by the user.
    const genderUpdate = existing.gender == null ? dto.gender : undefined;
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber?.trim() || undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: genderUpdate,
        preferredLocale: dto.preferredLocale,
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        emailVerified: true,
        authProvider: true,
        fullName: true,
        dateOfBirth: true,
        gender: true,
        preferredLocale: true,
      },
    });
  }
}
