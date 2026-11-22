import { Module } from '@nestjs/common';
import { LiveController } from './live.controller';
import { LiveGateway } from './live.gateway';
import { LiveKitService } from './livekit.service';
import { LiveRepository } from './live.repository';
import { LIVE_REPO } from './tokens';

@Module({ controllers: [LiveController], providers: [LiveGateway, LiveKitService, LiveRepository, { provide: LIVE_REPO, useExisting: LiveRepository }] })
export class LiveModule {}
