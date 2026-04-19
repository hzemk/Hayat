import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '@prisma-db/prisma.service';

interface AccessPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issue(userId: string, email: string, role: UserRole) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role } satisfies AccessPayload,
    );

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hash(refreshToken);
    const ttlDays = this.parseDays(this.config.get<string>('jwt.refreshTtl') ?? '30d');
    const expiresAt = new Date(Date.now() + ttlDays * 86400 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.config.get<string>('jwt.accessTtl'),
    };
  }

  async rotate(submitted: string) {
    const tokenHash = this.hash(submitted);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      return null;
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issue(record.user.id, record.user.email, record.user.role);
  }

  async revoke(submitted: string) {
    const tokenHash = this.hash(submitted);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseDays(ttl: string): number {
    const match = ttl.match(/^(\d+)d$/);
    if (!match) throw new UnauthorizedException('Invalid refresh TTL config');
    return parseInt(match[1], 10);
  }
}
