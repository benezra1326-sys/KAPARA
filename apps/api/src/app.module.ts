import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { ConversationsModule } from './conversations/conversations.module';
import { CrossedModule } from './crossed/crossed.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { HealthController } from './health/health.controller';
import { IntroductionsModule } from './introductions/introductions.module';
import { LiveModule } from './live/live.module';
import { PrismaModule } from './prisma/prisma.service';
import { ProfilesModule } from './profiles/profiles.module';
import { SafetyModule } from './safety/safety.module';
import { ShabbatModule } from './shabbat/shabbat.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        // Never log bodies or auth headers: profiles contain sensitive data.
        redact: ['req.headers.authorization', 'req.body', 'res.body'],
      },
    }),
    PrismaModule, AuthModule, SafetyModule, ShabbatModule, ProfilesModule, DiscoveryModule, CrossedModule, LiveModule, IntroductionsModule, ConversationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
