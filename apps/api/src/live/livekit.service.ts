import { Injectable, Logger } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { env, liveKitConfigured } from '../common/env';

export type JoinInfo =
  | { mode: 'livekit'; url: string; token: string; room: string }
  | { mode: 'demo'; room: string; notice: string };

@Injectable()
export class LiveKitService {
  private readonly log = new Logger(LiveKitService.name);

  /** Tokens start with camera publishing allowed but the app keeps it OFF until video_on. */
  async join(room: string, identity: string): Promise<JoinInfo> {
    if (!liveKitConfigured()) {
      return { mode: 'demo', room, notice: 'demo_call_simulated' };
    }
    const e = env();
    const at = new AccessToken(e.LIVEKIT_API_KEY, e.LIVEKIT_API_SECRET, { identity, ttl: '15m' });
    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
    this.log.log(`livekit token issued room=${room}`);
    return { mode: 'livekit', url: e.LIVEKIT_URL, token: await at.toJwt(), room };
  }
}
