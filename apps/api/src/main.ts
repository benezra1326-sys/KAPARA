import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { APP } from '@kapara/config';
import { AppModule } from './app.module';
import { env } from './common/env';

async function bootstrap() {
  const e = env(); // fail fast on bad configuration
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.enableCors({ origin: true });
  app.enableShutdownHooks();
  await app.listen(e.PORT);
  app.get(Logger).log(`${APP.name} API listening on :${e.PORT}`);
}
void bootstrap();
