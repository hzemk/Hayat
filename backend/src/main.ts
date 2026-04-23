import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());
  app.use(json({ limit: '12mb' }));
  app.use(urlencoded({ extended: true, limit: '12mb' }));
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isDev = nodeEnv === 'development';
  const isProd = nodeEnv === 'production';
  const originSetting = config.get<string>('app.origin') ?? '';
  const allowList = originSetting
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Production must have an explicit allowlist. credentials:true combined
  // with origin:'*' is rejected by browsers and is also a cross-site risk.
  if (isProd) {
    if (allowList.length === 0) {
      throw new Error(
        'CORS: APP_ORIGIN is required in production — set a comma-separated allowlist of exact origins',
      );
    }
    if (allowList.includes('*')) {
      throw new Error(
        'CORS: APP_ORIGIN="*" is not allowed in production with credentials:true — set explicit origins',
      );
    }
  }

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowList.includes('*')) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      if (
        isDev &&
        /^https?:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(
          origin,
        )
      ) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  });

  app.setGlobalPrefix(config.get<string>('app.apiPrefix') ?? 'api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = config.get<number>('app.port') ?? 4000;
  await app.listen(port);
  Logger.log(`Hayat API listening on :${port}`, 'Bootstrap');
}

bootstrap();
