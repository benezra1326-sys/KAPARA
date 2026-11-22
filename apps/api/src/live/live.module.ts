import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { LiveKitService } from './livekit.service';

@Module({ providers: [LiveGateway, LiveKitService] })
export class LiveModule {}
