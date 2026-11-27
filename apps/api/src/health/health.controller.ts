import { Controller, Get } from '@nestjs/common';
import { APP } from '@kapara/config';
import { env, liveKitConfigured } from '../common/env';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let db = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {}
    return { app: APP.name, db, live: liveKitConfigured() ? 'livekit' : env().NODE_ENV === 'production' ? 'disabled' : 'demo', environment: env().NODE_ENV };
  }
}
