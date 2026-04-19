import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';

// Derived from the access secret so a stolen share token can never be used as
// a user access token (different secret, and no `email`/`role` claims anyway).
const DERIVATION_SALT = '|med-id-share';
const SHARE_TTL_SECONDS = 24 * 60 * 60;

interface SharePayload {
  sub: string;
  scope: 'med-id';
}

@Injectable()
export class MedicalIdShareService {
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

  async sign(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = await this.jwt.signAsync(
      { sub: userId, scope: 'med-id' } satisfies SharePayload,
      { secret: this.secret, expiresIn: SHARE_TTL_SECONDS },
    );
    const expiresAt = new Date(Date.now() + SHARE_TTL_SECONDS * 1000);
    return { token, expiresAt };
  }

  async verify(token: string): Promise<{ userId: string }> {
    try {
      const payload = await this.jwt.verifyAsync<SharePayload>(token, {
        secret: this.secret,
      });
      if (payload.scope !== 'med-id' || !payload.sub) {
        throw new Error('bad scope');
      }
      return { userId: payload.sub };
    } catch {
      throw new UnauthorizedException('Invalid or expired share token');
    }
  }
}
