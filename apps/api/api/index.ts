/**
 * Vercel Serverless Entry Point for NestJS API
 *
 * NOTE: REST endpoints and HTTP work fully on Vercel.
 * Socket.IO (WebSocket) requires a persistent server — use Railway/Render
 * for full real-time game functionality.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, BadRequestException, INestApplication } from '@nestjs/common';
import * as express from 'express';
import * as cookieParserImport from 'cookie-parser';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

const cookieParser = (cookieParserImport as any).default ?? cookieParserImport;
const expressApp = express();
let cachedApp: INestApplication | null = null;

async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn'] },
  );

  app.use(cookieParser());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const details = errors.map((e) => ({
          field: e.property,
          issue: Object.values(e.constraints ?? {}).join(', '),
        }));
        return new BadRequestException({ message: 'Validation failed', details });
      },
    }),
  );

  app.enableCors({
    origin: process.env.SOCKET_CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  await app.init();
  return app;
}

export default async function handler(
  req: express.Request,
  res: express.Response,
) {
  if (!cachedApp) {
    cachedApp = await bootstrap();
  }
  expressApp(req, res);
}
