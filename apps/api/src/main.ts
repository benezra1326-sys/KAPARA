import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { APP } from '@kapara/config';
import { AppModule } from './app.module';
import { env, productionProblems } from './common/env';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const e = env(); // fail fast on bad configuration
  const problems = productionProblems(e);
  if (problems.length) {
    console.error(`Refusing to start in production:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // Real members never share a production database with fictional ones.
  if (e.NODE_ENV === 'production') {
    const demo = await app.get(PrismaService).user.count({ where: { isDemo: true } });
    if (demo > 0) {
      console.error(`Refusing to start in production: ${demo} demo accounts are in this database. Remove them with "npm run db:purge-demo -w @kapara/api".`);
      process.exit(1);
    }
  }
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.enableCors({ origin: true });
  app.enableShutdownHooks();
  await app.listen(e.PORT);
  app.get(Logger).log(`${APP.name} API listening on :${e.PORT}`);
}
void bootstrap();
