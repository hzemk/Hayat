import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';

// Derived from the access secret so a stolen cert token can't be used as a
// user access token (different secret, and scope='vaccine-cert' tied to one
// vaccination id).
const DERIVATION_SALT = '|vaccine-cert-share';
const SHARE_TTL_SECONDS = 24 * 60 * 60;

interface SharePayload {
  sub: string; // vaccination id
  uid: string; // owner user id (for audit only)
  scope: 'vaccine-cert';
}

@Injectable()
export class VaccineCertShareService {
  private readonly secret: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    const accessSecret = config.get<string>('jwt.accessSecret') ?? '';
    this.secret = createHash('sha256')
      .update(accessSecret + DERIVATION_SALT)
      .digest('hex');
  }

  async sign(
    vaccinationId: string,
    userId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = await this.jwt.signAsync(
      {
        sub: vaccinationId,
        uid: userId,
        scope: 'vaccine-cert',
      } satisfies SharePayload,
      { secret: this.secret, expiresIn: SHARE_TTL_SECONDS },
    );
    const expiresAt = new Date(Date.now() + SHARE_TTL_SECONDS * 1000);
    return { token, expiresAt };
  }

  async verify(
    token: string,
  ): Promise<{ vaccinationId: string; userId: string }> {
    try {
      const payload = await this.jwt.verifyAsync<SharePayload>(token, {
        secret: this.secret,
      });
      if (payload.scope !== 'vaccine-cert' || !payload.sub || !payload.uid) {
        throw new Error('bad scope');
      }
      return { vaccinationId: payload.sub, userId: payload.uid };
    } catch {
      throw new UnauthorizedException('Invalid or expired share token');
    }
  }
}
