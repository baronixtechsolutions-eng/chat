import { type INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { config } from './config.js';

// Shared by main.ts and the e2e tests so both run the same pipeline
export function configureApp(app: INestApplication) {
  app.use(cookieParser());
  app.enableCors({ origin: config.frontendUrl, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
