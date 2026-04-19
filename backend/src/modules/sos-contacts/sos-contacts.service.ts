import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma-db/prisma.service';
import { CreateSosContactDto } from './dto/create-sos-contact.dto';
import { UpdateSosContactDto } from './dto/update-sos-contact.dto';

const MAX_CONTACTS_PER_USER = 10;

@Injectable()
export class SosContactsService {
  constructor(private readonly prisma: PrismaService) {}

  listMine(userId: string) {
    return this.prisma.sosContact.findMany({
      where: { userId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateSosContactDto) {
    const count = await this.prisma.sosContact.count({ where: { userId } });
    if (count >= MAX_CONTACTS_PER_USER) {
      throw new ForbiddenException(
        `Maximum of ${MAX_CONTACTS_PER_USER} SOS contacts allowed`,
      );
    }
    return this.prisma.sosContact.create({
      data: {
        userId,
        name: dto.name.trim(),
        phoneNumber: normalizePhone(dto.phoneNumber),
        relationship: dto.relationship?.trim(),
        priority: dto.priority ?? count,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateSosContactDto) {
    await this.ensureOwner(userId, id);
    return this.prisma.sosContact.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        phoneNumber: dto.phoneNumber
          ? normalizePhone(dto.phoneNumber)
          : undefined,
        relationship: dto.relationship?.trim(),
        priority: dto.priority,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwner(userId, id);
    await this.prisma.sosContact.delete({ where: { id } });
  }

  private async ensureOwner(userId: string, id: string) {
    const contact = await this.prisma.sosContact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('SOS contact not found');
    if (contact.userId !== userId) throw new ForbiddenException();
    return contact;
  }
}

function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, '');
}
