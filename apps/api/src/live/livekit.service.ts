import { Injectable, Logger } from '@nestjs/common';
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import type { JoinInfo } from '@kapara/shared';
import { env, liveKitConfigured } from '../common/env';

export type { JoinInfo };

const AUDIO_ONLY = [TrackSource.MICROPHONE];
const AUDIO_VIDEO = [TrackSource.MICROPHONE, TrackSource.CAMERA];

/**
 * Media rooms. Camera consent is enforced by the media server, not only by
 * the app: tokens allow the microphone only, and the camera source is
 * granted to both participants only once both accepted video.
 * Without LIVEKIT_* variables: an announced demo mode in development, Live off in production.
 */
@Injectable()
export class LiveKitService {
  private readonly log = new Logger(LiveKitService.name);
  private rooms?: RoomServiceClient;

  /** Simulated media only outside production; production without LiveKit switches Live off. */
  get mode(): 'livekit' | 'demo' | 'disabled' {
    if (liveKitConfigured()) return 'livekit';
    return env().NODE_ENV === 'production' ? 'disabled' : 'demo';
  }

  async join(room: string, identity: string): Promise<JoinInfo> {
    if (!liveKitConfigured()) return { mode: 'demo', room, notice: 'demo_call_simulated' };
    const e = env();
    const at = new AccessToken(e.LIVEKIT_API_KEY, e.LIVEKIT_API_SECRET, { identity, ttl: '2h' });
    at.addGrant({ room, roomJoin: true, canSubscribe: true, canPublishData: false, canPublishSources: AUDIO_ONLY });
    this.log.log(`livekit token issued room=${room}`);
    return { mode: 'livekit', url: e.LIVEKIT_URL, token: await at.toJwt(), room };
  }

  /** Grants or withdraws the camera for both participants. */
  async setCamera(room: string, identities: string[], allowed: boolean) {
    const client = this.client();
    if (!client) return;
    await Promise.all(identities.map((id) => client.updateParticipant(room, id, {
      permission: { canSubscribe: true, canPublish: true, canPublishData: false, canPublishSources: allowed ? AUDIO_VIDEO : AUDIO_ONLY },
    }).catch((err: Error) => this.log.warn(`camera permission update failed room=${room}: ${err.message}`))));
  }

  /** Disconnects everyone; a token for this room is useless afterwards. */
  async close(room: string) {
    await this.client()?.deleteRoom(room).catch(() => undefined);
  }

  private client() {
    if (!liveKitConfigured()) return undefined;
    if (!this.rooms) {
      const e = env();
      this.rooms = new RoomServiceClient(e.LIVEKIT_URL.replace(/^ws/, 'http'), e.LIVEKIT_API_KEY, e.LIVEKIT_API_SECRET);
    }
    return this.rooms;
  }
}
