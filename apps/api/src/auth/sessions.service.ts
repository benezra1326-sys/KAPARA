import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { env } from '../common/env';
import { PrismaService } from '../prisma/prisma.service';
import { hmac, newOpaqueToken } from './crypto';

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_DAYS = 60;

/**
 * Short-lived JWT access tokens + opaque refresh tokens stored hashed.
 * Refresh tokens rotate on every use; presenting an already-rotated token
 * (theft or replay) revokes the whole session family.
 */
@Injectable()
export class SessionsService {
  private readonly log = new Logger(SessionsService.name);
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private hash(token: string) { return hmac(env().JWT_SECRET, `refresh:${token}`); }

  async issue(userId: string, familyId: string = randomUUID()) {
    const refreshToken = newOpaqueToken();
    await this.prisma.session.create({
      data: { userId, familyId, tokenHash: this.hash(refreshToken), expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000) },
    });
    const accessToken = await this.jwt.signAsync({ sub: userId, typ: 'access' }, { expiresIn: ACCESS_TTL_SECONDS });
    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS };
  }

  async refresh(refreshToken: string) {
    const s = await this.prisma.session.findUnique({ where: { tokenHash: this.hash(refreshToken) } });
    if (!s) throw new UnauthorizedException('invalid_refresh_token');
    if (s.revokedAt || s.rotatedAt) {
      if (s.rotatedAt && !s.revokedAt) {
        this.log.warn({ userId: s.userId }, 'refresh_token_reuse_detected');
        await this.revokeFamily(s.familyId);
      }
      throw new UnauthorizedException('invalid_refresh_token');
    }
    if (s.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('refresh_token_expired');
    // Atomic claim: two concurrent refreshes cannot both succeed.
    const claimed = await this.prisma.session.updateMany({ where: { id: s.id, rotatedAt: null, revokedAt: null }, data: { rotatedAt: new Date() } });
    if (claimed.count !== 1) throw new UnauthorizedException('invalid_refresh_token');
    return { userId: s.userId, ...(await this.issue(s.userId, s.familyId)) };
  }

  async revoke(refreshToken: string) {
    const s = await this.prisma.session.findUnique({ where: { tokenHash: this.hash(refreshToken) } });
    if (s) await this.revokeFamily(s.familyId);
  }

  revokeFamily(familyId: string) {
    return this.prisma.session.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  revokeAll(userId: string) {
    return this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
