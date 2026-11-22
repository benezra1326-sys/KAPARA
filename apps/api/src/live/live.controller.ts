import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { RULES } from '@kapara/config';
import { LiveSettings, type LiveStatus } from '@kapara/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { LiveKitService } from './livekit.service';
import { LiveRepository } from './live.repository';

@Controller('live')
@UseGuards(AuthGuard)
export class LiveController {
  constructor(private readonly repo: LiveRepository, private readonly livekit: LiveKitService) {}

  /** Tells the app honestly whether calls are real (LiveKit) or simulated. */
  @Get('status')
  status(): LiveStatus {
    return { mode: this.livekit.mode, availabilityMinutes: RULES.liveAvailabilityMinutes, inviteTtlSeconds: RULES.liveInviteTtlSeconds };
  }

  @Get('settings')
  settings(@CurrentUser() me: AuthUser) {
    return this.repo.settings(me.id);
  }

  /** "Who can call me" and the Live opt-in. */
  @Put('settings')
  save(@CurrentUser() me: AuthUser, @Body(new ZodPipe(LiveSettings)) body: LiveSettings) {
    return this.repo.saveSettings(me.id, body);
  }
}
