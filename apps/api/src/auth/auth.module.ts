import { Body, Controller, ForbiddenException, Global, Module, Post } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { z } from 'zod';
import { env } from '../common/env';
import { ZodPipe } from '../common/zod.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from './auth.guard';

const DemoLogin = z.object({ email: z.string().email() });

/**
 * v0: demo login only (no password, development/demo builds only).
 * Real auth (email OTP + Sign in with Apple/Google) is a dedicated workstream.
 */
@Controller('auth')
class AuthController {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  @Post('demo-login')
  async demoLogin(@Body(new ZodPipe(DemoLogin)) body: z.infer<typeof DemoLogin>) {
    if (env().NODE_ENV === 'production') throw new ForbiddenException('demo_login_disabled');
    const user = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw new ForbiddenException('unknown_demo_account');
    return { token: await this.jwt.signAsync({ sub: user.id }), userId: user.id, demo: true };
  }
}

@Global()
@Module({
  imports: [JwtModule.registerAsync({ useFactory: () => ({ secret: env().JWT_SECRET, signOptions: { expiresIn: '30d' } }) })],
  controllers: [AuthController],
  providers: [AuthGuard],
  exports: [AuthGuard, JwtModule],
})
export class AuthModule {}
