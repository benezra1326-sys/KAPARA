import {
  Body, Controller, ForbiddenException, Get, Global, HttpCode, HttpException, HttpStatus, Ip, Logger, Module, Post,
  ServiceUnavailableException, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { z } from 'zod';
import {
  OtpRequest, OtpVerify, RefreshRequest, SocialSignIn,
  type AuthMethods, type AuthTokens, type OtpRequestResult,
} from '@kapara/shared';
import { env, list } from '../common/env';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from './accounts.service';
import { AuthGuard, CurrentUser, type AuthUser } from './auth.guard';
import { newOtpCode } from './crypto';
import { Mailer } from './mailer';
import { IdTokenError, providerConfig, verifyIdToken, type SocialProvider } from './oidc';
import { checkOtp, OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS, otpHash, otpRequestAllowed } from './otp';
import { RateLimiter } from './rate-limit';
import { SessionsService } from './sessions.service';

const DemoLogin = z.object({ email: z.string().email() });
const isProd = () => env().NODE_ENV === 'production';

/**
 * Sign-in: email one-time code, Sign in with Apple, Sign in with Google.
 * A method whose provider is not configured says so (`GET /auth/methods`)
 * instead of pretending to work. Demo login exists outside production only.
 */
@Controller('auth')
class AuthController {
  private readonly log = new Logger('Auth');
  private readonly ipLimiter = new RateLimiter(30, 10 * 60_000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly accounts: AccountsService,
    private readonly mailer: Mailer,
  ) {}

  @Get('methods')
  methods(): AuthMethods {
    return {
      emailOtp: this.mailer.configured ? 'email' : isProd() ? 'unavailable' : 'demo',
      apple: list(env().APPLE_CLIENT_IDS).length > 0,
      google: list(env().GOOGLE_CLIENT_IDS).length > 0,
      demoLogin: !isProd(),
    };
  }

  @Post('otp/request')
  @HttpCode(200)
  async requestOtp(@Ip() ip: string, @Body(new ZodPipe(OtpRequest)) b: OtpRequest): Promise<OtpRequestResult> {
    this.ipLimiter.hit(`otp:${ip}`);
    const demo = !this.mailer.configured;
    if (demo && isProd()) throw new ServiceUnavailableException('email_delivery_not_configured');
    const recent = await this.prisma.emailOtp.findMany({
      where: { email: b.email, createdAt: { gt: new Date(Date.now() - 3600_000) } }, select: { createdAt: true },
    });
    const allowed = otpRequestAllowed(recent);
    if (!allowed.ok) throw new HttpException({ code: 'rate_limited', retryAfter: allowed.retryAfter }, HttpStatus.TOO_MANY_REQUESTS);

    const code = newOtpCode();
    // Only the latest code is valid.
    await this.prisma.emailOtp.updateMany({ where: { email: b.email, consumedAt: null }, data: { consumedAt: new Date() } });
    await this.prisma.emailOtp.create({
      data: { email: b.email, codeHash: otpHash(env().JWT_SECRET, b.email, code), expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000) },
    });
    if (demo) return { sent: false, delivery: 'demo', expiresInSeconds: OTP_TTL_SECONDS, devCode: code };
    await this.mailer.sendOtp(b.email, code, b.locale);
    return { sent: true, delivery: 'email', expiresInSeconds: OTP_TTL_SECONDS };
  }

  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Ip() ip: string, @Body(new ZodPipe(OtpVerify)) b: OtpVerify): Promise<AuthTokens> {
    this.ipLimiter.hit(`verify:${ip}`);
    const rec = await this.prisma.emailOtp.findFirst({ where: { email: b.email }, orderBy: { createdAt: 'desc' } });
    if (!rec) throw new UnauthorizedException('invalid_code');
    const r = checkOtp(env().JWT_SECRET, b.email, b.code, rec);
    if (r === 'mismatch') {
      await this.prisma.emailOtp.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException({ code: 'invalid_code', attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - rec.attempts - 1) });
    }
    if (r !== 'ok') throw new UnauthorizedException(r === 'expired' || r === 'consumed' ? 'code_expired' : 'too_many_attempts');
    // Single use, even under concurrent submissions.
    const claimed = await this.prisma.emailOtp.updateMany({ where: { id: rec.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (claimed.count !== 1) throw new UnauthorizedException('code_expired');

    const { user, isNewUser } = await this.accounts.byEmail(b.email, { regionCode: b.regionCode, locale: b.locale, verified: true });
    if (isNewUser) this.log.log({ userId: user.id, method: 'email' }, 'account_created');
    return { ...(await this.sessions.issue(user.id)), userId: user.id, isNewUser };
  }

  @Post('apple')
  @HttpCode(200)
  apple(@Ip() ip: string, @Body(new ZodPipe(SocialSignIn)) b: SocialSignIn) { return this.social('apple', ip, b); }

  @Post('google')
  @HttpCode(200)
  google(@Ip() ip: string, @Body(new ZodPipe(SocialSignIn)) b: SocialSignIn) { return this.social('google', ip, b); }

  private async social(provider: SocialProvider, ip: string, b: SocialSignIn): Promise<AuthTokens> {
    this.ipLimiter.hit(`social:${ip}`);
    const audiences = list(provider === 'apple' ? env().APPLE_CLIENT_IDS : env().GOOGLE_CLIENT_IDS);
    if (!audiences.length) throw new ServiceUnavailableException({ code: 'provider_not_configured', provider });
    let identity;
    try {
      identity = await verifyIdToken(providerConfig(provider, audiences), b.idToken, b.nonce);
    } catch (e) {
      throw new UnauthorizedException(e instanceof IdTokenError ? e.message : 'invalid_id_token');
    }
    const { user, isNewUser } = await this.accounts.byIdentity(identity, { regionCode: b.regionCode, locale: b.locale });
    if (isNewUser) this.log.log({ userId: user.id, method: provider }, 'account_created');
    return { ...(await this.sessions.issue(user.id)), userId: user.id, isNewUser };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Ip() ip: string, @Body(new ZodPipe(RefreshRequest)) b: RefreshRequest): Promise<AuthTokens> {
    this.ipLimiter.hit(`refresh:${ip}`);
    const r = await this.sessions.refresh(b.refreshToken);
    return { accessToken: r.accessToken, refreshToken: r.refreshToken, expiresIn: r.expiresIn, userId: r.userId, isNewUser: false };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body(new ZodPipe(RefreshRequest)) b: RefreshRequest) {
    await this.sessions.revoke(b.refreshToken);
    return { ok: true };
  }

  @Post('logout-all')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async logoutAll(@CurrentUser() me: AuthUser) {
    await this.sessions.revokeAll(me.id);
    return { ok: true };
  }

  /** Fictional demo accounts only, never in production. `token` kept for older app builds. */
  @Post('demo-login')
  @HttpCode(200)
  async demoLogin(@Body(new ZodPipe(DemoLogin)) body: z.infer<typeof DemoLogin>) {
    if (isProd()) throw new ForbiddenException('demo_login_disabled');
    const user = await this.prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user?.isDemo) throw new ForbiddenException('unknown_demo_account');
    const t = await this.sessions.issue(user.id);
    return { ...t, token: t.accessToken, userId: user.id, isNewUser: false, demo: true } satisfies AuthTokens & { token: string };
  }
}

@Global()
@Module({
  imports: [JwtModule.registerAsync({ useFactory: () => ({ secret: env().JWT_SECRET, signOptions: { expiresIn: '15m' } }) })],
  controllers: [AuthController],
  providers: [AuthGuard, SessionsService, AccountsService, Mailer],
  exports: [AuthGuard, JwtModule, SessionsService, AccountsService],
})
export class AuthModule {}
